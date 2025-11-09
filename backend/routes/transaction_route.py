from flask import Blueprint, jsonify, request
from extensions import db
from models.bills_model import Bill
from models.tenants_model import Tenant
from models.transaction_model import Transaction
from models.users_model import User
from models.notifications_model import Notification
from utils.cloudinary_utils import upload_to_cloudinary  # Import the shared utility
from datetime import datetime
import io
import traceback
import cloudinary.uploader
import re

transaction_bp = Blueprint("transactions", __name__)

def upload_receipt_pdf(pdf_buffer, bill_id):
    """Upload receipt PDF directly with proper configuration to prevent stream_hxbcrg"""
    try:
        # Generate unique filename
        filename = f"receipt_{bill_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        print(f"📤 Uploading receipt PDF with filename: {filename}")
        
        # Upload with explicit raw configuration
        result = cloudinary.uploader.upload(
            pdf_buffer,
            folder="house-rental/transactions/receipts",
            resource_type="raw",  # CRITICAL: Force raw for PDFs
            public_id=filename,
            use_filename=False,   # Prevent stream names
            unique_filename=True,
            overwrite=True,
            invalidate=True,
            type='upload'
        )
        
        # Get the secure URL
        secure_url = result.get('secure_url')
        public_id = result.get('public_id')
        version = result.get('version')
        
        print(f"✅ Cloudinary upload result:")
        print(f"   Original URL: {secure_url}")
        print(f"   Public ID: {public_id}")
        print(f"   Version: {version}")
        print(f"   Resource Type: {result.get('resource_type')}")
        
        # MANUALLY construct the URL to ensure it's correct
        if secure_url:
            # Force raw upload URL structure
            if '/image/upload/' in secure_url:
                secure_url = secure_url.replace('/image/upload/', '/raw/upload/')
                print(f"🔄 Fixed resource type: {secure_url}")
            
            # If it still doesn't have raw, reconstruct it completely
            if '/raw/upload/' not in secure_url:
                if version and public_id:
                    # Manual URL construction - THIS IS THE KEY FIX
                    secure_url = f"https://res.cloudinary.com/dm9eein09/raw/upload/v{version}/{public_id}"
                    print(f"🔄 Manually constructed URL: {secure_url}")
                else:
                    # Fallback: try to extract from the existing URL
                    match = re.search(r'v(\d+)/(.+)', secure_url)
                    if match:
                        version = match.group(1)
                        file_path = match.group(2)
                        secure_url = f"https://res.cloudinary.com/dm9eein09/raw/upload/v{version}/{file_path}"
            
            # Ensure the URL ends with .pdf for proper content-type
            if not secure_url.endswith('.pdf'):
                secure_url += '.pdf'
                
            print(f"🔧 Final receipt URL: {secure_url}")
        
        return secure_url
        
    except Exception as e:
        print(f"❌ Receipt PDF upload error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return None

@transaction_bp.route("/transactions/issue-receipt/<int:billid>", methods=["POST"])
def issue_receipt(billid):
    # Fetch the bill
    bill = db.session.query(Bill).filter(Bill.billid == billid).first()
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    if bill.status == "Paid":
        return jsonify({"error": "Bill already paid"}), 400

    # Fetch the tenant
    tenant = db.session.query(Tenant).filter(Tenant.tenantid == bill.tenantid).first()
    if not tenant:
        return jsonify({"error": "Tenant not found"}), 404

    # Fetch associated user info (name)
    user = db.session.query(User).filter(User.userid == tenant.userid).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        # ✅ Build full name from user model
        firstname = getattr(user, "firstname", "")
        middlename = getattr(user, "middlename", "")
        lastname = getattr(user, "lastname", "")
        full_name = f"{firstname} {middlename + ' ' if middlename else ''}{lastname}".strip()

        # 🧾 Generate Professional PDF using ReportLab (in memory)
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.units import inch
        
        # Create PDF in memory
        pdf_buffer = io.BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=A4,
            topMargin=0.5*inch,
            bottomMargin=0.5*inch
        )
        
        # Story to hold elements
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2E86AB'),
            spaceAfter=30,
            alignment=1  # Center
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#666666')
        )

        # Company Header
        company_header = [
            Paragraph("RENTAL MANAGEMENT SYSTEM", title_style),
            Paragraph("Official Payment Receipt", styles['Heading2']),
            Spacer(1, 20)
        ]
        story.extend(company_header)

        # Receipt Details in a table format
        receipt_data = [
            ['RECEIPT INFORMATION', ''],
            ['Receipt Number:', f'RMS-{bill.billid:06d}'],
            ['Issue Date:', datetime.now().strftime("%B %d, %Y")],
            ['Issue Time:', datetime.now().strftime("%I:%M %p")]
        ]
        
        receipt_table = Table(receipt_data, colWidths=[2.5*inch, 3.5*inch])
        receipt_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8F9FA')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),  # Labels in bold
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),      # Values in normal
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        story.append(receipt_table)
        story.append(Spacer(1, 20))

        # Tenant Information
        story.append(Paragraph("TENANT INFORMATION", header_style))
        tenant_data = [
            ['Tenant ID:', str(tenant.tenantid)],
            ['Full Name:', full_name],
            ['Bill ID:', str(bill.billid)]
        ]
        
        tenant_table = Table(tenant_data, colWidths=[1.5*inch, 4.5*inch])
        tenant_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),  # Labels in bold
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),       # Values in normal
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ]))
        
        story.append(tenant_table)
        story.append(Spacer(1, 20))

        # Payment Details
        story.append(Paragraph("PAYMENT DETAILS", header_style))
        
        # Format amount with proper peso sign
        amount_formatted = f"PHP {float(bill.amount):,.2f}"
        
        payment_data = [
            ['Description', 'Amount'],
            [f'{bill.billtype} Payment', amount_formatted]
        ]
        
        payment_table = Table(payment_data, colWidths=[4*inch, 2*inch])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (0, 1), 'LEFT'),
            ('ALIGN', (1, 1), (1, 1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#DDDDDD'))
        ]))
        
        story.append(payment_table)
        story.append(Spacer(1, 30))

        # Total Amount
        total_data = [
            ['TOTAL PAID:', amount_formatted]
        ]
        
        total_table = Table(total_data, colWidths=[4*inch, 2*inch])
        total_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A5276')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ]))
        
        story.append(total_table)
        story.append(Spacer(1, 30))

        # Footer
        footer_text = """Thank you for your payment!
        
This receipt serves as an official record of your transaction.
Please keep this document for your records.
For any inquiries, please contact our administration office."""
        
        footer_paragraph = Paragraph(footer_text, normal_style)
        story.append(footer_paragraph)

        # Build PDF
        doc.build(story)
        pdf_buffer.seek(0)

        # ✅ Use the dedicated PDF upload function (PREVENTS stream_hxbcrg)
        print(f"📤 Uploading receipt for bill {billid}...")
        receipt_url = upload_receipt_pdf(pdf_buffer, billid)
        
        if not receipt_url:
            return jsonify({"error": "Failed to upload receipt to Cloudinary"}), 500

        # ✅ Verify the URL is accessible and not a stream
        print(f"🔍 Verifying receipt URL: {receipt_url}")
        
        # Check if it's a stream URL (should NOT be)
        if 'stream_' in receipt_url:
            print(f"❌ STREAM URL DETECTED: {receipt_url}")
            return jsonify({"error": "Cloudinary returned a stream URL. Please try again."}), 500
        
        # Check if it's a proper raw URL (should BE)
        if '/raw/upload/' not in receipt_url:
            print(f"❌ NOT A RAW URL: {receipt_url}")
            return jsonify({"error": "Cloudinary URL is not a proper raw PDF URL"}), 500

        try:
            import requests
            response = requests.head(receipt_url, timeout=10)
            if response.status_code != 200:
                print(f"⚠️ URL verification failed: HTTP {response.status_code}")
                # Don't fail here, just log the warning
        except Exception as e:
            print(f"⚠️ URL verification error: {e}")

        # ✅ Update Bill status to Paid
        bill.status = "Paid"
        db.session.add(bill)

        # ✅ Add transaction record
        transaction = Transaction(
            billid=bill.billid,
            tenantid=bill.tenantid,
            paymentdate=datetime.now().strftime("%Y-%m-%d"),
            amountpaid=bill.amount,
            receipt=receipt_url
        )
        db.session.add(transaction)

        # ✅ Create UNIFIED notification for tenant
        tenant_notification = Notification(
            title='Payment Confirmed',
            message=f'Your payment for {bill.billtype} (PHP {float(bill.amount):,.2f}) has been confirmed. Receipt #RMS-{bill.billid:06d}',
            targetuserid=tenant.userid,
            isgroupnotification=False,
            recipientcount=1,
            createdbyuserid=tenant.userid
        )
        db.session.add(tenant_notification)

        # ✅ Create UNIFIED notification for ALL landlords
        all_landlords = User.query.filter_by(role='Owner').all()
        if all_landlords:
            landlord_notification = Notification(
                title='Payment Received',
                message=f'Tenant {full_name} has paid {bill.billtype} of PHP {float(bill.amount):,.2f}. Receipt #RMS-{bill.billid:06d}',
                targetuserrole='Owner',
                isgroupnotification=True,
                recipientcount=len(all_landlords),
                createdbyuserid=tenant.userid
            )
            db.session.add(landlord_notification)

        # ✅ Commit all changes
        db.session.commit()

        return jsonify({
            "message": "Receipt issued successfully",
            "receipt_url": receipt_url,
            "receipt_number": f"RMS-{bill.billid:06d}",
            "url_type": "raw_upload" if '/raw/upload/' in receipt_url else "unknown",
            "has_stream": 'stream_' in receipt_url
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error in issue_receipt: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to issue receipt: {str(e)}"}), 500

@transaction_bp.route("/transactions/reject/<int:billid>", methods=["PUT"])
def reject_payment(billid):
    """Reject a payment and reset bill status to Unpaid"""
    try:
        # Fetch the bill
        bill = db.session.query(Bill).filter(Bill.billid == billid).first()
        if not bill:
            return jsonify({"error": "Bill not found"}), 404

        if bill.status != "For Validation":
            return jsonify({"error": "Bill is not in 'For Validation' status"}), 400

        # Fetch the tenant
        tenant = db.session.query(Tenant).filter(Tenant.tenantid == bill.tenantid).first()
        if not tenant:
            return jsonify({"error": "Tenant not found"}), 404

        # Fetch associated user info
        user = db.session.query(User).filter(User.userid == tenant.userid).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Build full name
        firstname = getattr(user, "firstname", "")
        middlename = getattr(user, "middlename", "")
        lastname = getattr(user, "lastname", "")
        full_name = f"{firstname} {middlename + ' ' if middlename else ''}{lastname}".strip()

        # Reset bill status to Unpaid and clear payment details
        bill.status = "Unpaid"
        bill.gcash_receipt = None  # Clear the receipt (Cloudinary URL)
        bill.gcash_ref = None      # Clear the reference number
        bill.paymenttype = None    # Clear payment type
        
        db.session.add(bill)

        # Create notification for tenant
        tenant_notification = Notification(
            title='Payment Rejected',
            message=f'Your payment for {bill.billtype} (PHP {float(bill.amount):,.2f}) has been rejected. Please check your payment details and try again.',
            targetuserid=tenant.userid,
            isgroupnotification=False,
            recipientcount=1,
            createdbyuserid=tenant.userid
        )
        db.session.add(tenant_notification)

        # Create notification for landlords
        all_landlords = User.query.filter_by(role='Owner').all()
        if all_landlords:
            landlord_notification = Notification(
                title='Payment Rejected',
                message=f'Payment from {full_name} for {bill.billtype} (PHP {float(bill.amount):,.2f}) has been rejected.',
                targetuserrole='Owner',
                isgroupnotification=True,
                recipientcount=len(all_landlords),
                createdbyuserid=tenant.userid
            )
            db.session.add(landlord_notification)

        # Commit changes
        db.session.commit()

        return jsonify({
            "message": "Payment rejected successfully",
            "billid": billid,
            "new_status": "Unpaid"
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error in reject_payment: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to reject payment: {str(e)}"}), 500

@transaction_bp.route("/transactions/receipt/<int:billid>", methods=["GET"])
def get_receipt(billid):
    try:
        # Find the transaction for this bill
        transaction = db.session.query(Transaction).filter(Transaction.billid == billid).first()
        
        if not transaction:
            return jsonify({"error": "Transaction not found"}), 404
        
        if not transaction.receipt:
            return jsonify({"error": "No receipt available for this transaction"}), 404
        
        # Return the Cloudinary URL
        return jsonify({
            "receipt_url": transaction.receipt
        })
        
    except Exception as e:
        print(f"❌ Error in get_receipt: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to fetch receipt: {str(e)}"}), 500

@transaction_bp.route("/transactions/download-receipt/<int:billid>", methods=["GET"])
def download_receipt(billid):
    """Endpoint to redirect to Cloudinary receipt URL"""
    try:
        # Find the transaction for this bill
        transaction = db.session.query(Transaction).filter(Transaction.billid == billid).first()
        
        if not transaction or not transaction.receipt:
            return jsonify({"error": "Receipt not found"}), 404
        
        # Return the Cloudinary URL for download
        return jsonify({
            "download_url": transaction.receipt
        })
        
    except Exception as e:
        print(f"❌ Error in download_receipt: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to get receipt download URL: {str(e)}"}), 500

# ✅ Additional route to get all transactions (for admin/landlord view)
@transaction_bp.route("/transactions/all", methods=["GET"])
def get_all_transactions():
    try:
        transactions = (
            db.session.query(
                Transaction.transactionid,
                Transaction.billid,
                Transaction.tenantid,
                Transaction.paymentdate,
                Transaction.amountpaid,
                Transaction.receipt,
                User.firstname,
                User.lastname,
                Bill.billtype
            )
            .join(Bill, Transaction.billid == Bill.billid)
            .join(Tenant, Transaction.tenantid == Tenant.tenantid)
            .join(User, Tenant.userid == User.userid)
            .order_by(Transaction.paymentdate.desc())
            .all()
        )

        result = []
        for t in transactions:
            result.append({
                "transactionid": t.transactionid,
                "billid": t.billid,
                "tenantid": t.tenantid,
                "tenant_name": f"{t.firstname} {t.lastname}",
                "payment_date": t.paymentdate.strftime("%Y-%m-%d") if t.paymentdate else None,
                "amount_paid": float(t.amountpaid),
                "receipt_url": t.receipt,  # Cloudinary URL
                "bill_type": t.billtype
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Error in get_all_transactions: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to fetch transactions: {str(e)}"}), 500

# ✅ Additional route to get tenant's transaction history
@transaction_bp.route("/transactions/tenant/<int:tenant_id>", methods=["GET"])
def get_tenant_transactions(tenant_id):
    try:
        transactions = (
            db.session.query(
                Transaction.transactionid,
                Transaction.billid,
                Transaction.paymentdate,
                Transaction.amountpaid,
                Transaction.receipt,
                Bill.billtype,
                Bill.description
            )
            .join(Bill, Transaction.billid == Bill.billid)
            .filter(Transaction.tenantid == tenant_id)
            .order_by(Transaction.paymentdate.desc())
            .all()
        )

        result = []
        for t in transactions:
            result.append({
                "transactionid": t.transactionid,
                "billid": t.billid,
                "payment_date": t.paymentdate.strftime("%Y-%m-%d") if t.paymentdate else None,
                "amount_paid": float(t.amountpaid),
                "receipt_url": t.receipt,  # Cloudinary URL
                "bill_type": t.billtype,
                "description": t.description
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Error in get_tenant_transactions: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to fetch tenant transactions: {str(e)}"}), 500

# ✅ Get transaction statistics
@transaction_bp.route("/transactions/statistics", methods=["GET"])
def get_transaction_statistics():
    try:
        # Total transactions count
        total_transactions = db.session.query(Transaction).count()
        
        # Total revenue
        total_revenue = db.session.query(db.func.sum(Transaction.amountpaid)).scalar() or 0
        
        # Monthly revenue (current year)
        current_year = datetime.now().year
        monthly_revenue = db.session.query(
            db.func.extract('month', Transaction.paymentdate).label('month'),
            db.func.sum(Transaction.amountpaid).label('total')
        ).filter(
            db.func.extract('year', Transaction.paymentdate) == current_year
        ).group_by('month').all()

        # Recent transactions (last 10)
        recent_transactions = (
            db.session.query(
                Transaction.transactionid,
                Transaction.paymentdate,
                Transaction.amountpaid,
                User.firstname,
                User.lastname,
                Bill.billtype
            )
            .join(Bill, Transaction.billid == Bill.billid)
            .join(Tenant, Transaction.tenantid == Tenant.tenantid)
            .join(User, Tenant.userid == User.userid)
            .order_by(Transaction.paymentdate.desc())
            .limit(10)
            .all()
        )

        recent_list = []
        for t in recent_transactions:
            recent_list.append({
                "transactionid": t.transactionid,
                "payment_date": t.paymentdate.strftime("%Y-%m-%d") if t.paymentdate else None,
                "amount_paid": float(t.amountpaid),
                "tenant_name": f"{t.firstname} {t.lastname}",
                "bill_type": t.billtype
            })

        statistics = {
            "total_transactions": total_transactions,
            "total_revenue": float(total_revenue),
            "monthly_revenue": {int(month): float(total) for month, total in monthly_revenue},
            "current_year": current_year,
            "recent_transactions": recent_list
        }

        return jsonify(statistics), 200

    except Exception as e:
        print(f"❌ Error in get_transaction_statistics: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to fetch transaction statistics: {str(e)}"}), 500

# ✅ Search transactions with filters
@transaction_bp.route("/transactions/search", methods=["GET"])
def search_transactions():
    try:
        # Get query parameters
        tenant_id = request.args.get('tenant_id', type=int)
        bill_type = request.args.get('bill_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Build query
        query = db.session.query(
            Transaction.transactionid,
            Transaction.billid,
            Transaction.tenantid,
            Transaction.paymentdate,
            Transaction.amountpaid,
            Transaction.receipt,
            User.firstname,
            User.lastname,
            Bill.billtype
        ).join(Bill, Transaction.billid == Bill.billid)\
         .join(Tenant, Transaction.tenantid == Tenant.tenantid)\
         .join(User, Tenant.userid == User.userid)

        if tenant_id:
            query = query.filter(Transaction.tenantid == tenant_id)
        if bill_type:
            query = query.filter(Bill.billtype == bill_type)
        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Transaction.paymentdate >= start_date)
        if end_date:
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Transaction.paymentdate <= end_date)

        transactions = query.order_by(Transaction.paymentdate.desc()).all()

        result = []
        for t in transactions:
            result.append({
                "transactionid": t.transactionid,
                "billid": t.billid,
                "tenantid": t.tenantid,
                "tenant_name": f"{t.firstname} {t.lastname}",
                "payment_date": t.paymentdate.strftime("%Y-%m-%d") if t.paymentdate else None,
                "amount_paid": float(t.amountpaid),
                "receipt_url": t.receipt,  # Cloudinary URL
                "bill_type": t.billtype
            })

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    except Exception as e:
        print(f"❌ Error in search_transactions: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to search transactions: {str(e)}"}), 500

# ✅ Get transaction by ID
@transaction_bp.route("/transactions/<int:transaction_id>", methods=["GET"])
def get_transaction_by_id(transaction_id):
    try:
        transaction = (
            db.session.query(
                Transaction.transactionid,
                Transaction.billid,
                Transaction.tenantid,
                Transaction.paymentdate,
                Transaction.amountpaid,
                Transaction.receipt,
                User.firstname,
                User.lastname,
                User.email,
                User.phone,
                Bill.billtype,
                Bill.description,
                Bill.issuedate
            )
            .join(Bill, Transaction.billid == Bill.billid)
            .join(Tenant, Transaction.tenantid == Tenant.tenantid)
            .join(User, Tenant.userid == User.userid)
            .filter(Transaction.transactionid == transaction_id)
            .first()
        )

        if not transaction:
            return jsonify({"error": "Transaction not found"}), 404

        result = {
            "transactionid": transaction.transactionid,
            "billid": transaction.billid,
            "tenantid": transaction.tenantid,
            "tenant_name": f"{transaction.firstname} {transaction.lastname}",
            "tenant_email": transaction.email,
            "tenant_phone": transaction.phone,
            "payment_date": transaction.paymentdate.strftime("%Y-%m-%d") if transaction.paymentdate else None,
            "amount_paid": float(transaction.amountpaid),
            "receipt_url": transaction.receipt,  # Cloudinary URL
            "bill_type": transaction.billtype,
            "bill_description": transaction.description,
            "bill_issue_date": transaction.issuedate.strftime("%Y-%m-%d") if transaction.issuedate else None
        }

        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Error in get_transaction_by_id: {traceback.format_exc()}")
        return jsonify({"error": f"Failed to fetch transaction: {str(e)}"}), 500

# ✅ Diagnostic route to check receipt PDF files
@transaction_bp.route("/transactions/diagnose-receipt/<int:billid>", methods=["GET"])
def diagnose_receipt(billid):
    try:
        transaction = db.session.query(Transaction).filter(Transaction.billid == billid).first()
        if not transaction:
            return jsonify({"error": "Transaction not found"}), 404
        
        import requests
        
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
                    from PyPDF2 import PdfReader
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
        
        results = {}
        if transaction.receipt:
            results["receipt"] = check_pdf(transaction.receipt, "Receipt")
        
        return jsonify({
            "billid": billid,
            "transaction_id": transaction.transactionid,
            "diagnosis": results
        })
        
    except Exception as e:
        return jsonify({"error": f"Diagnosis failed: {str(e)}"}), 500

# ✅ Test upload endpoint to verify no stream_hxbcrg
@transaction_bp.route("/transactions/test-upload", methods=["GET"])
def test_upload():
    """Test PDF upload to verify no stream_hxbcrg"""
    try:
        # Create a simple test PDF
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        c.drawString(100, 750, "Test PDF Upload - No Stream")
        c.save()
        pdf_buffer.seek(0)
        
        # Upload using our fixed method
        receipt_url = upload_receipt_pdf(pdf_buffer, "test_999")
        
        if receipt_url:
            return jsonify({
                "success": True,
                "url": receipt_url,
                "has_stream": "stream_" in receipt_url,
                "is_raw_upload": "/raw/upload/" in receipt_url,
                "is_image_upload": "/image/upload/" in receipt_url,
                "is_download": "/download/" in receipt_url
            })
        else:
            return jsonify({"error": "Upload failed"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500