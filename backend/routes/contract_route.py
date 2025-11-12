from flask import Blueprint, request, jsonify
from datetime import datetime
from extensions import db
from models.contracts_model import Contract
from models.tenants_model import Tenant
from models.units_model import House as Unit
from models.applications_model import Application
from models.users_model import User
from models.notifications_model import Notification
from utils.cloudinary_utils import upload_pdf_as_image  # Import the PDF to image function
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
import cloudinary.uploader
import re

contract_bp = Blueprint("contract_bp", __name__)

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

        # ✅ ENHANCED: Use upload_pdf_as_image to convert PDF to image and upload
        pdf_buffer.seek(0)
        print(f"📤 Converting contract PDF to image and uploading to Cloudinary...")
        pdf_url = upload_pdf_as_image(
            pdf_buffer,
            'contracts/generated',
            filename_prefix=f'contract_{tenant_id}'
        )
        
        if not pdf_url:
            return jsonify({"error": "Failed to upload contract image to Cloudinary"}), 500

        # ✅ Enhanced verification
        print(f"🔍 Verifying contract URL: {pdf_url}")
        
        is_image_url = '/image/upload/' in pdf_url
        has_stream = 'stream_' in pdf_url
        is_raw_upload = '/raw/upload/' in pdf_url
        
        if not is_image_url:
            print(f"⚠️  Warning: URL may not be proper image resource: {pdf_url}")
        
        if has_stream:
            print(f"⚠️  Warning: Stream URL detected but proceeding: {pdf_url}")
        
        # Don't fail on stream URLs anymore - just log warning

        return jsonify({
            "message": "Professional contract PDF generated successfully!",
            "pdf_url": pdf_url,
            "contract_id": f"RT-{int(tenant_id):06d}",
            "url_type": "image_upload" if is_image_url else "other",
            "is_image": is_image_url,
            "has_stream": has_stream
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
            "generated_contract": generated_contract,  # Cloudinary URL (now image)
            "signed_contract": signed_contract,  # Cloudinary URL (now image)
            "is_image_url": '/image/upload/' in (generated_contract or '') or '/image/upload/' in (signed_contract or '')
        }
        for contractid, unit_name, unit_price, start_date, end_date, status, generated_contract, signed_contract in contracts
    ]

    return jsonify(result)

# ✅ Tenant sign contract - FIXED VERSION with better signature placement
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

        # ✅ Process the tenant signature
        img_data = signature_file.read()
        if not img_data:
            return jsonify({"error": "Signature file is empty"}), 400
            
        signature_file.seek(0)  # Reset file pointer
        
        sig_image = Image.open(io.BytesIO(img_data))

        # Fix transparency to white background
        if sig_image.mode == "RGBA":
            white_bg = Image.new("RGB", sig_image.size, (255, 255, 255))
            white_bg.paste(sig_image, mask=sig_image.split()[3])
            sig_image = white_bg

        # Resize signature to be larger and more visible
        max_width, max_height = 200, 80  # Increased size for better visibility
        sig_image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        # ✅ Download the contract image from Cloudinary
        import requests
        
        print(f"📥 Downloading contract image from: {contract.generated_contract}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(contract.generated_contract, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Failed to download contract image. Status: {response.status_code}")
            return jsonify({"error": f"Cannot download contract image. Status: {response.status_code}"}), 500

        # Load the contract image
        contract_image = Image.open(io.BytesIO(response.content))
        
        # Ensure both images are in RGB mode
        if contract_image.mode != 'RGB':
            contract_image = contract_image.convert('RGB')
        if sig_image.mode != 'RGB':
            sig_image = sig_image.convert('RGB')

        # ✅ Create a new image with signature overlay
        signed_image = contract_image.copy()
        
        # ✅ Position for tenant signature - CENTERED and at proper height
        # Calculate position to center the signature horizontally
        signature_x = 100  # Center horizontally
        signature_y = signed_image.height - 200  # Position from bottom
        
        # Paste signature onto contract image
        signed_image.paste(sig_image, (signature_x, signature_y))

        # ✅ Save the signed image to buffer
        signed_image_buffer = io.BytesIO()
        signed_image.save(signed_image_buffer, format='JPEG', quality=90, optimize=True)
        signed_image_buffer.seek(0)

        print(f"📤 Uploading signed contract image to Cloudinary...")
        
        # ✅ Upload the signed image to Cloudinary
        from utils.cloudinary_utils import upload_image_to_cloudinary
        
        signed_contract_url = upload_image_to_cloudinary(
            signed_image_buffer,
            'contracts/signed',
            filename_prefix=f'signed_contract_{contract_id}'
        )
        
        if not signed_contract_url:
            return jsonify({"error": "Failed to upload signed contract image to Cloudinary"}), 500

        # ✅ Enhanced verification
        print(f"🔍 Verifying signed contract URL: {signed_contract_url}")
        
        is_image_url = '/image/upload/' in signed_contract_url
        has_stream = 'stream_' in signed_contract_url
        
        if not is_image_url:
            print(f"⚠️  Warning: URL may not be proper image resource: {signed_contract_url}")
        
        if has_stream:
            print(f"⚠️  Warning: Stream URL detected but proceeding: {signed_contract_url}")

        print(f"✅ Signed contract uploaded to: {signed_contract_url}")

        # ✅ Update DB with signed contract URL
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
            "contract_id": contract.contractid,
            "url_type": "image_upload" if is_image_url else "other",
            "is_image": is_image_url,
            "has_stream": has_stream
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
                return jsonify({
                    "url": contract.generated_contract,
                    "is_image": '/image/upload/' in contract.generated_contract
                })
            elif filename in contract.signed_contract:
                return jsonify({
                    "url": contract.signed_contract,
                    "is_image": '/image/upload/' in contract.signed_contract
                })
        
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

# ✅ Enhanced test PDF to image upload for contracts
@contract_bp.route("/contracts/test-image-upload", methods=["GET"])
def test_contract_image_upload():
    """Test PDF to image upload functionality for contracts"""
    try:
        # Create a simple test PDF
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, "Test Contract PDF to Image Upload")
        c.setFont("Helvetica", 12)
        c.drawString(100, 730, "This should upload as an IMAGE to Cloudinary")
        c.drawString(100, 710, f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.drawString(100, 690, "If successful, this will be viewable as an image!")
        c.save()
        pdf_buffer.seek(0)
        
        # Upload using the PDF to image function
        contract_url = upload_pdf_as_image(
            pdf_buffer,
            'test/contracts',
            filename_prefix='test_contract'
        )
        
        if contract_url:
            is_image_url = '/image/upload/' in contract_url
            has_stream = 'stream_' in contract_url
            is_raw_upload = '/raw/upload/' in contract_url
            
            return jsonify({
                "success": True,
                "image_url": contract_url,
                "has_stream": has_stream,
                "is_image_upload": is_image_url,
                "is_raw_upload": is_raw_upload,
                "message": "✅ Contract PDF successfully converted to image and uploaded!" if is_image_url else "⚠️  Upload may not be proper image"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Contract image upload failed",
                "message": "❌ Failed to upload contract PDF as image to Cloudinary"
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "❌ Test failed with exception"
        }), 500

# ✅ New endpoint to get contract statistics
@contract_bp.route("/contracts/statistics", methods=["GET"])
def get_contract_statistics():
    """Get contract statistics for dashboard"""
    try:
        total_contracts = Contract.query.count()
        active_contracts = Contract.query.filter_by(status='Active').count()
        pending_contracts = Contract.query.filter_by(status='Pending').count()
        signed_contracts = Contract.query.filter_by(status='Signed').count()
        terminated_contracts = Contract.query.filter_by(status='Terminated').count()

        # Recent contracts (last 10)
        recent_contracts = (
            db.session.query(
                Contract.contractid,
                Contract.startdate,
                Contract.status,
                User.firstname,
                User.lastname,
                Unit.name.label("unit_name")
            )
            .join(Tenant, Contract.tenantid == Tenant.tenantid)
            .join(User, Tenant.userid == User.userid)
            .join(Unit, Contract.unitid == Unit.unitid)
            .order_by(Contract.startdate.desc())
            .limit(10)
            .all()
        )

        recent_list = []
        for contract in recent_contracts:
            recent_list.append({
                "contractid": contract.contractid,
                "start_date": contract.startdate.strftime("%Y-%m-%d") if contract.startdate else None,
                "status": contract.status,
                "tenant_name": f"{contract.firstname} {contract.lastname}",
                "unit_name": contract.unit_name
            })

        statistics = {
            "total_contracts": total_contracts,
            "active_contracts": active_contracts,
            "pending_contracts": pending_contracts,
            "signed_contracts": signed_contracts,
            "terminated_contracts": terminated_contracts,
            "recent_contracts": recent_list
        }

        return jsonify(statistics), 200

    except Exception as e:
        print(f"❌ Error in get_contract_statistics: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to fetch contract statistics: {str(e)}"}), 500

# ✅ New endpoint to search contracts
@contract_bp.route("/contracts/search", methods=["GET"])
def search_contracts():
    """Search contracts with filters"""
    try:
        tenant_name = request.args.get('tenant_name')
        unit_name = request.args.get('unit_name')
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Build query
        query = db.session.query(
            Contract.contractid,
            Contract.startdate,
            Contract.enddate,
            Contract.status,
            User.firstname,
            User.lastname,
            Unit.name.label("unit_name"),
            Unit.price.label("unit_price")
        ).join(Tenant, Contract.tenantid == Tenant.tenantid)\
         .join(User, Tenant.userid == User.userid)\
         .join(Unit, Contract.unitid == Unit.unitid)

        if tenant_name:
            query = query.filter(
                (User.firstname.ilike(f'%{tenant_name}%')) | 
                (User.lastname.ilike(f'%{tenant_name}%'))
            )
        if unit_name:
            query = query.filter(Unit.name.ilike(f'%{unit_name}%'))
        if status:
            query = query.filter(Contract.status == status)
        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Contract.startdate >= start_date)
        if end_date:
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Contract.enddate <= end_date)

        contracts = query.order_by(Contract.startdate.desc()).all()

        result = []
        for contract in contracts:
            result.append({
                "contractid": contract.contractid,
                "start_date": contract.startdate.strftime("%Y-%m-%d") if contract.startdate else None,
                "end_date": contract.enddate.strftime("%Y-%m-%d") if contract.enddate else None,
                "status": contract.status,
                "tenant_name": f"{contract.firstname} {contract.lastname}",
                "unit_name": contract.unit_name,
                "unit_price": float(contract.unit_price) if contract.unit_price else 0
            })

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    except Exception as e:
        print(f"❌ Error in search_contracts: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to search contracts: {str(e)}"}), 500