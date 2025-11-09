from flask import Blueprint, request, jsonify
from datetime import datetime
from extensions import db
from models.contracts_model import Contract
from models.tenants_model import Tenant
from models.units_model import House as Unit
from models.applications_model import Application
from models.users_model import User
from models.notifications_model import Notification
from utils.cloudinary_utils import upload_to_cloudinary  # Import the shared utility
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import os, traceback
import io
from PyPDF2 import PdfReader, PdfWriter
import base64
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from PIL import Image

contract_bp = Blueprint("contract_bp", __name__)

# ✅ Fetch existing contracts
@contract_bp.route("/contracts/tenants", methods=["GET"])
def get_tenant_contracts():
    contracts = (
        db.session.query(
            Contract.contractid,
            Tenant.tenantid,
            User.firstname,
            User.middlename,
            User.lastname,
            User.image,
            Unit.name.label("unit_name"),
            Unit.price.label("unit_price"),
            Contract.startdate,
            Contract.enddate,
            Contract.status,
            Contract.signed_contract
        )
        .join(Tenant, Contract.tenantid == Tenant.tenantid)
        .join(User, Tenant.userid == User.userid)
        .join(Unit, Contract.unitid == Unit.unitid)
        .all()
    )

    result = [
        {
            "contractid": contractid,
            "tenantid": tenantid,
            "fullname": f"{firstname} {middlename + ' ' if middlename else ''}{lastname}",
            "image": image,
            "unit_name": unit_name,
            "unit_price": unit_price,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d") if end_date else None,
            "status": status,
            "signed_contract": signed_contract  # Now Cloudinary URL
        }
        for contractid, tenantid, firstname, middlename, lastname, image, unit_name, unit_price, start_date, end_date, status, signed_contract in contracts
    ]

    return jsonify(result)

# ✅ Applicants ready for contracts
@contract_bp.route("/contracts/applicants", methods=["GET"])
def get_applicants_for_contract():
    applicants = (
        db.session.query(
            Application.applicationid,
            User.userid,
            User.firstname,
            User.middlename,
            User.lastname,
            User.email,
            User.phone,
            Unit.unitid,
            Unit.name.label("unit_name"),
            Unit.price.label("unit_price"),
            Application.status
        )
        .join(User, User.userid == Application.userid)
        .join(Unit, Unit.unitid == Application.unitid)
        .filter(Application.status == "Pending")
        .all()
    )

    result = []
    for (
        applicationid, userid, firstname, middlename, lastname,
        email, phone, unitid, unit_name, unit_price, status
    ) in applicants:
        tenant = Tenant.query.filter_by(userid=userid).first()
        tenantid = tenant.tenantid if tenant else None

        # Skip if already has contract
        if tenant and Contract.query.filter_by(tenantid=tenantid).first():
            continue

        result.append({
            "applicationid": applicationid,
            "userid": userid,
            "tenantid": tenantid,
            "fullname": f"{firstname} {middlename + ' ' if middlename else ''}{lastname}",
            "email": email,
            "phone": phone,
            "unitid": unitid,
            "unit_name": unit_name,
            "unit_price": unit_price,
            "status": status
        })

    return jsonify(result)

# ✅ Generate Contract PDF
@contract_bp.route("/contracts/generate-pdf", methods=["POST"])
def generate_contract_pdf():
    try:
        data = request.get_json()
        tenant_id = data.get("tenantid")
        tenant_name = data.get("tenant_name")
        unit_name = data.get("unit_name")
        start_date = data.get("start_date")
        rent = data.get("monthlyrent")
        deposit = data.get("deposit")
        advance = data.get("advancepayment")
        remarks = data.get("remarks")
        owner_signature_data = data.get("owner_signature")

        if not tenant_id or not tenant_name:
            return jsonify({"error": "Missing tenant information"}), 400

        # Create PDF in memory first
        pdf_buffer = io.BytesIO()

        # ✅ Create professional PDF document
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'ContractTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=20,
            alignment=1
        )
        
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=12,
            spaceBefore=20
        )
        
        normal_style = ParagraphStyle(
            'ContractNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            leading=14
        )
        
        bold_style = ParagraphStyle(
            'ContractBold',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            fontWeight='bold'
        )

        # Header
        header = Paragraph("RENTAL AGREEMENT CONTRACT", title_style)
        story.append(header)
        
        company_subheader = Paragraph("RenTahanan Property Management", styles['Heading2'])
        story.append(company_subheader)
        story.append(Spacer(1, 20))

        # Contract Information Table
        contract_info = [
            ['CONTRACT DETAILS', ''],
            ['Contract Date:', datetime.now().strftime("%B %d, %Y")],
            ['Contract ID:', f'RT-{int(tenant_id):06d}'],
            ['', '']
        ]
        
        contract_table = Table(contract_info, colWidths=[2*inch, 4*inch])
        contract_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8F9FA')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),  # Labels in bold
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),      # Values in normal
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        
        story.append(contract_table)
        story.append(Spacer(1, 20))

        # Parties Section
        parties_text = """
        This Rental Agreement ("Agreement") is made and entered into on this date between:
        """
        story.append(Paragraph(parties_text, normal_style))
        story.append(Spacer(1, 10))

        # Parties Table
        parties_data = [
            ['PARTY', 'INFORMATION'],
            ['LANDLORD/Owner:', 'RenTahanan Property Management'],
            ['TENANT/Lessee:', f'{tenant_name} Tenant ID: {tenant_id}']
        ]
        
        parties_table = Table(parties_data, colWidths=[2*inch, 4*inch])
        parties_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495E')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#FFFFFF')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#DDDDDD')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(parties_table)
        story.append(Spacer(1, 5))

        # Property Details Section
        story.append(Paragraph("PROPERTY DETAILS", section_style))
        
        # Format amounts with PHP instead of peso sign
        rent_formatted = f"PHP {float(rent):,.2f}"
        deposit_formatted = f"PHP {float(deposit):,.2f}"
        advance_formatted = f"PHP {float(advance):,.2f}"
        
        property_data = [
            ['Unit/Room:', unit_name],
            ['Commencement Date:', start_date],
            ['Monthly Rental:', rent_formatted],
            ['Security Deposit:', deposit_formatted],
            ['Advance Payment:', advance_formatted]
        ]
        
        property_table = Table(property_data, colWidths=[2*inch, 4*inch])
        property_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),  # Labels in bold
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),       # Values in normal
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        story.append(property_table)
        
        if remarks and remarks.strip():
            story.append(Spacer(1, 10))
            remarks_para = Paragraph(f"Special Remarks: {remarks}", normal_style)
            story.append(remarks_para)
        story.append(Spacer(1, 5))

        # Terms and Conditions
        story.append(Paragraph("TERMS AND CONDITIONS", section_style))
        
        # Add some sample terms (you can customize these)
        terms = [
            "1. The Tenant shall pay the monthly rent on or before the 5th day of each month.",
            "2. The Security Deposit shall be refundable upon termination of this agreement.",
            "3. The Tenant shall maintain the premises in good condition.",
            "4. The Landlord shall be responsible for major repairs and maintenance of the property.",
        ]
        
        for term in terms:
            story.append(Paragraph(term, normal_style))
            story.append(Spacer(1, 5))

        story.append(Spacer(1, 5))
        
        # Build the PDF
        doc.build(story)

        # ✅ Add signatures to the final PDF using canvas (if provided)
        if owner_signature_data:
            try:
                # Get the PDF content from buffer
                pdf_buffer.seek(0)
                existing_pdf = PdfReader(pdf_buffer)
                
                # Create a new buffer for the signed PDF
                signed_pdf_buffer = io.BytesIO()
                
                # Process owner signature
                img_data = base64.b64decode(owner_signature_data.split(",")[1])
                sig_image = Image.open(io.BytesIO(img_data))

                # Fix transparency to white background
                if sig_image.mode == "RGBA":
                    white_bg = Image.new("RGB", sig_image.size, (255, 255, 255))
                    white_bg.paste(sig_image, mask=sig_image.split()[3])
                    sig_image = white_bg

                # Create signature overlay
                packet = io.BytesIO()
                can = canvas.Canvas(packet, pagesize=A4)
                
                img_buffer = io.BytesIO()
                sig_image.save(img_buffer, format="PNG")
                img_buffer.seek(0)
                signature_reader = ImageReader(img_buffer)

                # Position for landlord signature
                can.drawImage(signature_reader, 390, 65, width=120, height=40, mask='auto')
                
                # Add labels
                can.setFont("Helvetica-Bold", 10)
                can.drawString(100, 50, "Tenant")
                can.drawString(430, 50, "Landlord")
                
                can.save()

                # Merge the signature page with the original PDF
                packet.seek(0)
                new_pdf = PdfReader(packet)
                output = PdfWriter()

                # Merge signatures onto the last page
                page = existing_pdf.pages[0]
                page.merge_page(new_pdf.pages[0])
                output.add_page(page)

                # Write to signed buffer
                output.write(signed_pdf_buffer)
                signed_pdf_buffer.seek(0)
                
                # Use the signed buffer for upload
                pdf_buffer = signed_pdf_buffer
                    
            except Exception as sig_error:
                print(f"Signature addition failed, but PDF was generated: {sig_error}")

        # ✅ Upload PDF to Cloudinary using RAW resource type
        pdf_buffer.seek(0)
        
        # Upload to Cloudinary with explicit raw type for PDFs
        pdf_url = upload_to_cloudinary(
            pdf_buffer, 
            "contracts/generated", 
            "raw"  # Explicitly use "raw" for PDFs
        )
        
        if not pdf_url:
            return jsonify({"error": "Failed to upload contract to Cloudinary"}), 500

        # Verify the URL contains "/raw/upload/" which indicates successful PDF upload
        if "/raw/upload/" not in pdf_url:
            print(f"⚠️ Warning: PDF URL doesn't contain '/raw/upload/': {pdf_url}")

        return jsonify({
            "message": "Professional contract PDF generated successfully!",
            "pdf_url": pdf_url,
            "contract_id": f"RT-{int(tenant_id):06d}"
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate contract: {str(e)}"}), 500

# ✅ Issue Contract to Tenant
@contract_bp.route("/contracts/issuecontract", methods=["POST"])
def issue_contract():
    try:
        data = request.get_json()
        tenant_id = data.get("tenantid")
        unit_id = data.get("unitid")
        start_date_str = data.get("startdate")
        generated_contract = data.get("generated_contract")

        if not all([tenant_id, unit_id, start_date_str]):
            return jsonify({"error": "Missing contract information"}), 400

        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()

        new_contract = Contract(
            tenantid=tenant_id,
            unitid=unit_id,
            startdate=start_date,
            enddate=None,
            status="Pending",
            generated_contract=generated_contract or "N/A",
            signed_contract=None
        )
        db.session.add(new_contract)
        db.session.flush()  # Get contract ID without committing

        # ✅ Get tenant info for notification
        tenant = Tenant.query.filter_by(tenantid=tenant_id).first()
        unit = Unit.query.filter_by(unitid=unit_id).first()

        if tenant:
            # ✅ Create UNIFIED notification for tenant
            tenant_notification = Notification(
                title='New Contract Issued',
                message=f'A new rental contract has been issued for {unit.name if unit else "your unit"}. Please review and sign the contract.',
                targetuserid=tenant.userid,  # Specific to this tenant
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

            # ✅ Create UNIFIED notification for ALL landlords
            all_landlords = User.query.filter_by(role='Owner').all()
            if all_landlords:
                landlord_notification = Notification(
                    title='New Contract Created',
                    message=f'New rental contract issued to tenant for {unit.name if unit else "a unit"}. Contract ID: {new_contract.contractid}',
                    targetuserrole='Owner',  # Target all landlords
                    isgroupnotification=True,
                    recipientcount=len(all_landlords),
                    createdbyuserid=tenant.userid
                )
                db.session.add(landlord_notification)

        db.session.commit()

        return jsonify({"message": "Contract issued successfully!"})

    except Exception as e:
        db.session.rollback()
        print(traceback.format_exc())
        return jsonify({"error": f"Failed to issue contract: {str(e)}"}), 500

# ✅ Tenant view their contracts
@contract_bp.route("/contracts/tenant/<int:tenant_id>", methods=["GET"])
def get_contracts_by_tenant(tenant_id):
    contracts = (
        db.session.query(
            Contract.contractid,
            Unit.name.label("unit_name"),
            Unit.price.label("unit_price"),
            Contract.startdate,
            Contract.enddate,
            Contract.status,
            Contract.generated_contract,
            Contract.signed_contract
        )
        .join(Unit, Contract.unitid == Unit.unitid)
        .filter(Contract.tenantid == tenant_id)
        .all()
    )

    result = [
        {
            "contractid": contractid,
            "unit_name": unit_name,
            "unit_price": unit_price,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d") if end_date else None,
            "status": status,
            "generated_contract": generated_contract,  # Cloudinary URL
            "signed_contract": signed_contract  # Cloudinary URL
        }
        for contractid, unit_name, unit_price, start_date, end_date, status, generated_contract, signed_contract in contracts
    ]

    return jsonify(result)

# ✅ Tenant sign contract (attach signature to existing generated PDF) - FIXED VERSION
@contract_bp.route("/contracts/sign", methods=["POST"])
def sign_contract():
    try:
        if "signed_contract" not in request.files:
            return jsonify({"error": "No signature file provided"}), 400

        signature_file = request.files["signed_contract"]
        contract_id = request.form.get("contractid")

        if not contract_id or signature_file.filename == "":
            return jsonify({"error": "Missing contract ID or file"}), 400

        print(f"🔍 Starting sign process for contract {contract_id}")

        # ✅ Find contract in DB
        contract = Contract.query.filter_by(contractid=contract_id).first()
        if not contract:
            return jsonify({"error": "Contract not found"}), 404

        if not contract.generated_contract:
            return jsonify({"error": "No generated contract found to sign"}), 400

        print(f"📄 Generated contract URL: {contract.generated_contract}")

        # ✅ Download the existing generated PDF from Cloudinary
        import requests
        
        # Use the Cloudinary URL directly
        pdf_url = contract.generated_contract
        
        # Fix URL if it's using image upload instead of raw
        if "/image/upload/" in pdf_url:
            # Convert to raw URL format
            pdf_url = pdf_url.replace("/image/upload/", "/raw/upload/")
            print(f"🔄 Fixed URL to use raw upload: {pdf_url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        print(f"📥 Downloading PDF from: {pdf_url}")
        response = requests.get(pdf_url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Failed to download PDF. Status: {response.status_code}")
            # Try the original URL as fallback
            response = requests.get(contract.generated_contract, headers=headers, timeout=30)
            if response.status_code != 200:
                return jsonify({"error": f"Cannot download contract PDF. Status: {response.status_code}"}), 500

        # Check if we got a PDF
        if not response.content.startswith(b'%PDF'):
            print(f"❌ Downloaded content is not a PDF")
            print(f"❌ First bytes: {response.content[:10]}")
            return jsonify({"error": "Downloaded file is not a valid PDF"}), 500

        print(f"✅ Successfully downloaded PDF ({len(response.content)} bytes)")

        existing_pdf_buffer = io.BytesIO(response.content)
        
        # Verify it's a valid PDF
        try:
            pdf_reader = PdfReader(existing_pdf_buffer)
            print(f"✅ Valid PDF with {len(pdf_reader.pages)} pages")
            existing_pdf_buffer.seek(0)
        except Exception as e:
            print(f"❌ Invalid PDF: {e}")
            return jsonify({"error": "Downloaded file is not a valid PDF"}), 500

        # ✅ Process the tenant signature
        img_data = signature_file.read()
        if not img_data:
            return jsonify({"error": "Signature file is empty"}), 400
            
        signature_file.seek(0)  # Reset file pointer for potential re-use
        
        sig_image = Image.open(io.BytesIO(img_data))

        # Fix transparency to white background
        if sig_image.mode == "RGBA":
            white_bg = Image.new("RGB", sig_image.size, (255, 255, 255))
            white_bg.paste(sig_image, mask=sig_image.split()[3])
            sig_image = white_bg

        # Resize signature
        max_width, max_height = 120, 40
        sig_image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        # ✅ Create signature overlay PDF
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=A4)
        
        # Save processed signature to buffer
        img_buffer = io.BytesIO()
        sig_image.save(img_buffer, format="PNG", optimize=True)
        img_buffer.seek(0)
        signature_reader = ImageReader(img_buffer)

        # Position for tenant signature (left side)
        can.drawImage(signature_reader, 100, 65, width=120, height=40, mask='auto')
        
        # Add signature labels
        can.setFont("Helvetica-Bold", 10)
        can.drawString(100, 50, "Tenant Signature")
        can.drawString(430, 50, "Landlord Signature")
        
        # Add signing date
        can.setFont("Helvetica", 9)
        can.drawString(100, 35, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
        
        can.save()

        # ✅ Merge the signature overlay with the existing PDF
        packet.seek(0)
        new_pdf = PdfReader(packet)
        existing_pdf = PdfReader(existing_pdf_buffer)
        output = PdfWriter()

        # Merge signatures onto the first page
        page = existing_pdf.pages[0]
        page.merge_page(new_pdf.pages[0])
        output.add_page(page)

        # Add remaining pages if any
        for i in range(1, len(existing_pdf.pages)):
            output.add_page(existing_pdf.pages[i])

        # ✅ Save the final signed PDF
        final_pdf_buffer = io.BytesIO()
        output.write(final_pdf_buffer)
        final_pdf_buffer.seek(0)

        print(f"📤 Uploading signed PDF to Cloudinary...")
        
        # ✅ Upload final signed PDF to Cloudinary with RAW resource type
        signed_contract_url = upload_to_cloudinary(
            final_pdf_buffer, 
            "contracts/signed", 
            "raw"  # Explicitly use "raw" for PDFs
        )
        
        if not signed_contract_url:
            return jsonify({"error": "Failed to upload signed contract to Cloudinary"}), 500

        print(f"✅ Signed PDF uploaded to: {signed_contract_url}")

        # ✅ Update DB with signed PDF URL
        contract.signed_contract = signed_contract_url
        contract.status = "Signed"
        
        # ✅ Create notifications
        tenant = Tenant.query.filter_by(tenantid=contract.tenantid).first()
        unit = Unit.query.filter_by(unitid=contract.unitid).first()

        if tenant:
            tenant_notification = Notification(
                title='Contract Signed',
                message=f'You have successfully signed the rental contract for {unit.name if unit else "your unit"}.',
                targetuserid=tenant.userid,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

            all_landlords = User.query.filter_by(role='Owner').all()
            if all_landlords:
                landlord_notification = Notification(
                    title='Contract Signed by Tenant',
                    message=f'Tenant has signed the rental contract for {unit.name if unit else "a unit"}. Contract ID: {contract.contractid}',
                    targetuserrole='Owner',
                    isgroupnotification=True,
                    recipientcount=len(all_landlords),
                    createdbyuserid=tenant.userid
                )
                db.session.add(landlord_notification)

        db.session.commit()

        print(f"✅ Contract {contract_id} signed successfully!")

        return jsonify({
            "message": "Contract signed successfully!",
            "signed_contract_url": signed_contract_url,
            "contract_id": contract.contractid
        })

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error in sign_contract: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to sign contract: {str(e)}"}), 500

# ✅ Download contract file (now returns Cloudinary URL)
@contract_bp.route("/contracts/download/<filename>", methods=["GET"])
def download_contract(filename):
    """Return Cloudinary URL for contract download"""
    try:
        # Since files are in Cloudinary, we return the URL
        # Frontend can handle the download directly from Cloudinary
        contract = Contract.query.filter(
            (Contract.generated_contract.contains(filename)) | 
            (Contract.signed_contract.contains(filename))
        ).first()
        
        if contract:
            if filename in contract.generated_contract:
                return jsonify({"url": contract.generated_contract})
            elif filename in contract.signed_contract:
                return jsonify({"url": contract.signed_contract})
        
        return jsonify({"error": "File not found"}), 404
        
    except Exception as e:
        return jsonify({"error": f"Failed to get file URL: {str(e)}"}), 500

# ✅ Update Contract Status (for landlords to approve/reject)
@contract_bp.route("/contracts/update-status/<int:contract_id>", methods=["PUT"])
def update_contract_status(contract_id):
    try:
        data = request.get_json()
        new_status = data.get("status")
        remarks = data.get("remarks", "")

        if not new_status:
            return jsonify({"error": "Missing status"}), 400

        contract = Contract.query.filter_by(contractid=contract_id).first()
        if not contract:
            return jsonify({"error": "Contract not found"}), 404

        old_status = contract.status
        contract.status = new_status

        # ✅ Get tenant info for notification
        tenant = Tenant.query.filter_by(tenantid=contract.tenantid).first()
        unit = Unit.query.filter_by(unitid=contract.unitid).first()

        if tenant:
            status_messages = {
                "Approved": "Your rental contract has been approved and is now active!",
                "Rejected": f"Your rental contract has been rejected. {remarks}",
                "Cancelled": f"Your rental contract has been cancelled. {remarks}",
                "Expired": "Your rental contract has expired."
            }

            message = status_messages.get(new_status, f"Contract status updated to {new_status}.")

            # ✅ Create UNIFIED notification for tenant
            tenant_notification = Notification(
                title=f'Contract {new_status}',
                message=message,
                targetuserid=tenant.userid,  # Specific to this tenant
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

        db.session.commit()

        return jsonify({"message": f"Contract status updated to {new_status} successfully!"})

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error updating contract status: {e}")
        return jsonify({"error": f"Failed to update contract status: {str(e)}"}), 500

@contract_bp.route('/contracts/terminate', methods=['POST'])
def terminate_contract():
    try:
        data = request.get_json()
        
        contract_id = data.get('contractid')
        tenant_id = data.get('tenantid')
        termination_date = data.get('termination_date')
        terminated_by = data.get('terminated_by')
        
        # Validate required fields
        if not all([contract_id, tenant_id, termination_date]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields: contractid, tenantid, termination_date'
            }), 400
        
        # Update contract status and end date
        contract = Contract.query.filter_by(contractid=contract_id).first()
        if not contract:
            return jsonify({
                'success': False,
                'message': 'Contract not found'
            }), 404
        
        contract.status = 'Terminated'
        contract.enddate = termination_date
        contract.updatedat = datetime.utcnow()
        
        # Update tenant status
        tenant = Tenant.query.filter_by(tenantid=tenant_id).first()
        if tenant:
            tenant.status = 'Terminated'
            tenant.updatedat = datetime.utcnow()
        
        # Get current user ID from session or request
        current_user_id = data.get('createdbyuserid', 1)
        
        # Create notification for tenant
        tenant_user = User.query.filter_by(userid=tenant.userid).first()
        if tenant_user:
            # Get unit name
            unit_name = "the unit"  # Default fallback
            
            # Query the unit table using unitid from contract
            if hasattr(contract, 'unitid') and contract.unitid:
                unit = Unit.query.filter_by(unitid=contract.unitid).first()
                if unit:
                    unit_name = unit.name
            
            notification = Notification(
                title="Tenancy Ended",
                message=f"Your tenancy at {unit_name} has been terminated effective {termination_date}.",
                targetuserid=tenant_user.userid,
                targetuserrole=current_user_id,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=current_user_id,
                creationdate=datetime.utcnow()
            )
            db.session.add(notification)
        
        # Create notification for owner
        owner_notification = Notification(
            title="Contract Terminated",
            message=f"Tenancy for {tenant_user.firstname if tenant_user else 'Tenant'} at {unit_name} has been terminated.",
            targetuserrole='Owner',
            isgroupnotification=True,
            recipientcount=1,
            createdbyuserid=current_user_id,
            creationdate=datetime.utcnow()
        )
        db.session.add(owner_notification)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Contract terminated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error terminating contract: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error terminating contract: {str(e)}'
        }), 500
        
@contract_bp.route('/contracts/terminate-tenant', methods=['POST'])
def terminate_tenant_contract():
    try:
        data = request.get_json()
        
        contract_id = data.get('contractid')
        tenant_id = data.get('tenantid')
        termination_date = data.get('termination_date')
        terminated_by = data.get('terminated_by')
        
        # Validate required fields
        if not all([contract_id, tenant_id, termination_date]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Update contract - set status to "Termination Requested" instead of immediate termination
        contract = Contract.query.filter_by(contractid=contract_id).first()
        if not contract:
            return jsonify({
                'success': False,
                'message': 'Contract not found'
            }), 404
        
        contract.status = 'Termination Requested'
        contract.enddate = termination_date
        contract.updatedat = datetime.utcnow()
        
        # Get current user ID from session or request
        current_user_id = data.get('createdbyuserid', 1)
        
        # Create notification for landlord
        owner_notification = Notification(
            title="Tenancy Termination Requested",
            message=f"Tenant has requested to terminate their tenancy effective {termination_date}. Please review and approve.",
            targetuserrole='Owner',
            isgroupnotification=True,
            recipientcount=1,
            createdbyuserid=current_user_id,
            creationdate=datetime.utcnow()
        )
        db.session.add(owner_notification)
        
        # Create notification for tenant
        tenant = Tenant.query.filter_by(tenantid=tenant_id).first()
        if tenant:
            tenant_user = User.query.filter_by(userid=tenant.userid).first()
            if tenant_user:
                notification = Notification(
                    title="Termination Request Sent",
                    message=f"Your tenancy termination request has been sent to the landlord. They will review and respond.",
                    targetuserid=tenant_user.userid,
                    targetuserrole=None,
                    isgroupnotification=False,
                    recipientcount=1,
                    createdbyuserid=current_user_id,
                    creationdate=datetime.utcnow()
                )
                db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Termination request sent successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error processing termination request: {str(e)}'
        }), 500

# Approve tenant termination request
@contract_bp.route('/contracts/approve-termination', methods=['POST'])
def approve_termination():
    try:
        data = request.get_json()
        
        contract_id = data.get('contractid')
        tenant_id = data.get('tenantid')
        approved_by = data.get('approved_by')
        
        # Validate required fields
        if not all([contract_id, tenant_id]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Update contract status to Terminated
        contract = Contract.query.filter_by(contractid=contract_id).first()
        if not contract:
            return jsonify({
                'success': False,
                'message': 'Contract not found'
            }), 404
        
        contract.status = 'Terminated'
        contract.updatedat = datetime.utcnow()
        
        # Update tenant status
        tenant = Tenant.query.filter_by(tenantid=tenant_id).first()
        if tenant:
            tenant.status = 'Terminated'
            tenant.updatedat = datetime.utcnow()
        
        # Get current user ID
        current_user_id = data.get('createdbyuserid', 1)
        
        # Create notification for tenant
        tenant_user = User.query.filter_by(userid=tenant.userid).first()
        if tenant_user:
            notification = Notification(
                title="Termination Approved",
                message=f"Your tenancy termination request has been approved. Your contract will end on {contract.enddate}.",
                targetuserid=tenant_user.userid,
                targetuserrole=None,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=current_user_id,
                creationdate=datetime.utcnow()
            )
            db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Termination request approved successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error approving termination: {str(e)}'
        }), 500

# Reject tenant termination request
@contract_bp.route('/contracts/reject-termination', methods=['POST'])
def reject_termination():
    try:
        data = request.get_json()
        
        contract_id = data.get('contractid')
        tenant_id = data.get('tenantid')
        rejected_by = data.get('rejected_by')
        
        # Validate required fields
        if not all([contract_id, tenant_id]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields'
            }), 400
        
        # Update contract status back to Active
        contract = Contract.query.filter_by(contractid=contract_id).first()
        if not contract:
            return jsonify({
                'success': False,
                'message': 'Contract not found'
            }), 404
        
        contract.status = 'Active'
        contract.enddate = None  # Remove the termination date
        contract.updatedat = datetime.utcnow()
        
        # Get current user ID
        current_user_id = data.get('createdbyuserid', 1)
        
        # Create notification for tenant
        tenant = Tenant.query.filter_by(tenantid=tenant_id).first()
        if tenant:
            tenant_user = User.query.filter_by(userid=tenant.userid).first()
            if tenant_user:
                notification = Notification(
                    title="Termination Rejected",
                    message="Your tenancy termination request has been rejected. Please contact the landlord for more information.",
                    targetuserid=tenant_user.userid,
                    targetuserrole=None,
                    isgroupnotification=False,
                    recipientcount=1,
                    createdbyuserid=current_user_id,
                    creationdate=datetime.utcnow()
                )
                db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Termination request rejected successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error rejecting termination: {str(e)}'
        }), 500

# ✅ Diagnostic route to check PDF files
@contract_bp.route("/contracts/diagnose-pdf/<int:contract_id>", methods=["GET"])
def diagnose_pdf(contract_id):
    try:
        contract = Contract.query.filter_by(contractid=contract_id).first()
        if not contract:
            return jsonify({"error": "Contract not found"}), 404
        
        import requests
        
        results = {}
        
        def check_pdf(url, label):
            if not url:
                return {"error": "No URL provided"}
            
            try:
                # Download the file
                response = requests.get(url, timeout=30)
                result = {
                    "url": url,
                    "status_code": response.status_code,
                    "content_length": len(response.content),
                    "headers": dict(response.headers)
                }
                
                if response.status_code != 200:
                    result["error"] = f"HTTP {response.status_code}"
                    return result
                
                # Check if it starts with PDF header
                is_pdf = response.content.startswith(b'%PDF')
                result["is_valid_pdf_header"] = is_pdf
                
                # Check first few bytes
                result["first_10_bytes"] = response.content[:10].hex()
                
                # Try to parse as PDF
                try:
                    pdf_buffer = io.BytesIO(response.content)
                    pdf_reader = PdfReader(pdf_buffer)
                    result["pdf_page_count"] = len(pdf_reader.pages)
                    result["pdf_is_encrypted"] = pdf_reader.is_encrypted
                    result["pdf_valid"] = True
                except Exception as e:
                    result["pdf_valid"] = False
                    result["pdf_error"] = str(e)
                
                return result
                
            except Exception as e:
                return {"error": str(e)}
        
        # Check generated contract
        if contract.generated_contract:
            results["generated_contract"] = check_pdf(contract.generated_contract, "Generated")
        
        # Check signed contract
        if contract.signed_contract:
            results["signed_contract"] = check_pdf(contract.signed_contract, "Signed")
        
        return jsonify({
            "contract_id": contract_id,
            "diagnosis": results
        })
        
    except Exception as e:
        return jsonify({"error": f"Diagnosis failed: {str(e)}"}), 500