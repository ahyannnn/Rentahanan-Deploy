from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, current_app
from extensions import db
from models.tenants_model import Tenant
from models.users_model import User
from models.units_model import House as Unit
from models.contracts_model import Contract
from models.bills_model import Bill
from models.notifications_model import Notification
from werkzeug.utils import secure_filename
import os
import logging

bill_bp = Blueprint("bill_bp", __name__)

# ✅ Set up logging
logger = logging.getLogger(__name__)

# ✅ Allowed file extensions
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_isoformat(date_obj):
    """Safely convert date/datetime object to ISO format string"""
    if date_obj is None:
        return None
    if hasattr(date_obj, 'isoformat'):
        return date_obj.isoformat()
    # If it's already a string, return as-is
    return str(date_obj)

def safe_strftime(date_obj, format_str="%Y-%m-%d"):
    """Safely format date/datetime object to string"""
    if date_obj is None:
        return None
    if hasattr(date_obj, 'strftime'):
        return date_obj.strftime(format_str)
    # If it's already a string, return as-is
    return str(date_obj)

# -------------------------------
# 📘 Get all bills (for admin)
# -------------------------------
@bill_bp.route("/billing/bills", methods=["GET"])
def get_bills():
    try:
        # Get current month and year
        current_date = datetime.now()
        current_month = current_date.month
        current_year = current_date.year
        
        # Calculate first and last day of current month
        first_day = datetime(current_year, current_month, 1)
        if current_month == 12:
            last_day = datetime(current_year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = datetime(current_year, current_month + 1, 1) - timedelta(days=1)

        bills = (
            db.session.query(
                Bill.billid,
                Tenant.tenantid,
                User.firstname,
                User.middlename,
                User.lastname,
                Unit.name.label("unit_name"),
                Unit.price.label("unit_price"),
                Bill.issuedate,
                Bill.duedate,
                Bill.amount,
                Bill.billtype,
                Bill.status,
                Bill.description,
                Bill.paymenttype,
                Bill.gcash_ref,
                Bill.gcash_receipt
            )
            .join(Tenant, Bill.tenantid == Tenant.tenantid)
            .join(User, Tenant.userid == User.userid)
            .join(Contract, Contract.tenantid == Tenant.tenantid)
            .join(Unit, Unit.unitid == Contract.unitid)
            .filter(Bill.issuedate >= first_day, Bill.issuedate <= last_day)
            .all()
        )

        result = []
        for b in bills:
            result.append({
                "billid": b.billid,
                "tenantid": b.tenantid,
                "tenant_name": f"{b.firstname} {b.middlename + ' ' if b.middlename else ''}{b.lastname}",
                "unit_name": b.unit_name,
                "unit_price": b.unit_price,
                "issuedate": safe_isoformat(b.issuedate),
                "duedate": safe_isoformat(b.duedate),
                "amount": float(b.amount) if b.amount else 0,
                "billtype": b.billtype,
                "status": b.status,
                "description": b.description,
                "paymenttype": b.paymenttype,
                "GCash_Ref": b.gcash_ref,
                "GCash_receipt": b.gcash_receipt
            })

        logger.info(f"✅ Retrieved {len(result)} bills for {current_month}/{current_year}")
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"❌ Error retrieving bills: {e}")
        return jsonify({"error": "Failed to retrieve bills"}), 500


# -------------------------------
# 🧾 Create a new bill (for both tenants and applicants)
# -------------------------------
@bill_bp.route("/billing/create", methods=["POST"])
def create_bill():
    data = request.get_json()
    tenantid = data.get("tenantId")
    issuedate = data.get("issuedDate", datetime.now().date())
    duedate = data.get("dueDate")
    amount = data.get("amount")
    billtype = data.get("billType")
    status = data.get("status", "Unpaid")
    description = data.get("description")

    if not tenantid or not amount or not billtype:
        return jsonify({"error": "Missing required fields: tenantId, amount, and billType are required"}), 400

    try:
        # Validate and parse dates
        if issuedate:
            if isinstance(issuedate, str):
                issuedate = datetime.strptime(issuedate, "%Y-%m-%d").date()
        else:
            issuedate = datetime.now().date()
            
        if duedate and isinstance(duedate, str):
            duedate = datetime.strptime(duedate, "%Y-%m-%d").date()

        # Find contract if exists
        contract = Contract.query.filter_by(tenantid=tenantid).first()
        contractid = contract.contractid if contract else None

        # Create new bill
        new_bill = Bill(
            tenantid=tenantid,
            contractid=contractid,
            issuedate=issuedate,
            duedate=duedate,
            amount=amount,
            billtype=billtype,
            status=status,
            description=description,
            autogenerated=False,
        )
        db.session.add(new_bill)
        db.session.flush()

        # ✅ Create notification for tenant
        tenant = Tenant.query.filter_by(tenantid=tenantid).first()
        if tenant:
            formatted_amount = f"₱{float(amount):,.2f}"
            due_date_str = safe_strftime(duedate) if duedate else "Not specified"
            
            tenant_notification = Notification(
                title='New Bill Issued',
                message=f'New {billtype} bill for {formatted_amount} has been issued. Due date: {due_date_str}',
                targetuserid=tenant.userid,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

        db.session.commit()
        
        logger.info(f"✅ Bill created successfully: ID {new_bill.billid} for tenant {tenantid}")
        
        return jsonify({
            "message": "Bill created successfully!",
            "billid": new_bill.billid,
        }), 201

    except ValueError as e:
        logger.error(f"❌ Date format error: {e}")
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error creating bill: {e}")
        return jsonify({"error": "Failed to create bill"}), 500


# -------------------------------
# 📋 Get Paid Bills for Payment History
# -------------------------------
@bill_bp.route("/bills/paid/<int:tenant_id>", methods=["GET"])
def get_paid_bills(tenant_id):
    try:
        logger.info(f"🔹 Fetching paid bills for tenant {tenant_id}")
        
        # Query only paid bills for the specific tenant
        paid_bills = (
            db.session.query(
                Bill.billid,
                Bill.tenantid,
                Bill.billtype,
                Bill.amount,
                Bill.status,
                Bill.issuedate,
                Bill.duedate,
                Bill.paymenttype,
                Bill.gcash_ref,
                Bill.description
            )
            .filter(
                Bill.tenantid == tenant_id,
                Bill.status.in_(["PAID", "For Validation", "Completed"])
            )
            .order_by(Bill.issuedate.desc())
            .all()
        )

        bills_list = []
        for bill in paid_bills:
            # Format dates for display using safe functions
            issue_date = safe_strftime(bill.issuedate)
            due_date = safe_strftime(bill.duedate)
            
            bills_list.append({
                "id": bill.billid,
                "billType": bill.billtype,
                "status": bill.status,
                "date": issue_date,
                "amount": f"₱{float(bill.amount):,.2f}",
                "paymentType": bill.paymenttype,
                "gcashRef": bill.gcash_ref,
                "description": bill.description,
                "dueDate": due_date
            })

        logger.info(f"✅ Returning {len(bills_list)} paid bills for tenant {tenant_id}")
        return jsonify(bills_list), 200

    except Exception as e:
        logger.error(f"❌ Error fetching paid bills for tenant {tenant_id}: {e}")
        return jsonify({"error": f"Failed to fetch paid bills: {str(e)}"}), 500


# -------------------------------
# 📋 Get issued invoices for applicants (to filter already billed applicants)
# -------------------------------
@bill_bp.route("/billing/issued-applicant-invoices", methods=["GET"])
def get_issued_applicant_invoices():
    try:
        # Query bills that are for applicants (initial payments)
        applicant_bills = (
            db.session.query(
                Bill.billid,
                Bill.tenantid,
                Bill.billtype,
                Bill.amount,
                Bill.status,
                Bill.issuedate,
                Bill.duedate,
                Bill.description
            )
            .filter(
                Bill.billtype.in_([
                    "Security Deposit & Advance Payment", 
                    "Advance Rent Only", 
                    "Security Deposit Only"
                ])
            )
            .all()
        )

        result = []
        for bill in applicant_bills:
            result.append({
                "billid": bill.billid,
                "tenantId": bill.tenantid,
                "billtype": bill.billtype,
                "amount": float(bill.amount) if bill.amount else 0,
                "status": bill.status,
                "issuedate": safe_isoformat(bill.issuedate),
                "duedate": safe_isoformat(bill.duedate),
                "description": bill.description
            })

        logger.info(f"✅ Returning {len(result)} issued applicant invoices")
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"❌ Error fetching issued applicant invoices: {e}")
        return jsonify({"error": f"Failed to fetch issued applicant invoices: {str(e)}"}), 500


# -------------------------------
# 📄 Get bills by tenant
# -------------------------------
@bill_bp.route("/bills/<tenant_id>", methods=["GET"])
def get_tenant_bills(tenant_id):
    try:
        tenant_id_int = int(tenant_id)
        bills = Bill.query.filter_by(tenantid=tenant_id_int).all()
        
        # Get the contract for this tenant
        contract = Contract.query.filter_by(tenantid=tenant_id_int).first()
        
        bills_list = []
        for bill in bills:
            bills_list.append({
                "billid": bill.billid,
                "contractid": bill.contractid,
                "tenantid": bill.tenantid,
                "issuedate": safe_isoformat(bill.issuedate),
                "duedate": safe_isoformat(bill.duedate),
                "amount": float(bill.amount) if bill.amount else 0,
                "billtype": bill.billtype,
                "status": bill.status,
                "description": bill.description,
                "paymenttype": bill.paymenttype,
                "gcash_ref": bill.gcash_ref,
                "gcash_receipt": bill.gcash_receipt,
                "contract_start_date": safe_isoformat(contract.startdate) if contract else None,
            })

        logger.info(f"✅ Returning {len(bills_list)} bills for tenant {tenant_id_int}")
        return jsonify(bills_list), 200

    except ValueError:
        return jsonify({"error": "Invalid tenant ID"}), 400
    except Exception as e:
        logger.error(f"❌ Error fetching tenant bills: {e}")
        return jsonify({"error": str(e)}), 500

@bill_bp.route("/billing/contract-details/<int:tenant_id>", methods=["GET"])
def get_contract_details(tenant_id):
    try:
        # Get contract for the tenant
        contract = Contract.query.filter_by(tenantid=tenant_id).first()
        
        if not contract:
            return jsonify({"error": "No contract found for this tenant"}), 404
        
        # Calculate next due date based on contract start date
        today = datetime.now().date()
        contract_start = contract.startdate
        
        # Calculate the due date for the current period
        # If contract started on day 15, due date is 15th of each month
        due_date_day = contract_start.day
        
        # Calculate next due date
        if today.day <= due_date_day:
            # Due date is this month
            next_due_date = datetime(today.year, today.month, due_date_day).date()
        else:
            # Due date is next month
            if today.month == 12:
                next_due_date = datetime(today.year + 1, 1, due_date_day).date()
            else:
                next_due_date = datetime(today.year, today.month + 1, due_date_day).date()
        
        return jsonify({
            "contract_start_date": safe_isoformat(contract_start),
            "due_date_day": due_date_day,
            "next_due_date": safe_isoformat(next_due_date),
            "unit_name": contract.unit.name if contract.unit else None,
            "monthly_rent": float(contract.unit_price) if contract.unit_price else 0
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting contract details: {e}")
        return jsonify({"error": f"Failed to get contract details: {str(e)}"}), 500
# -------------------------------
# 💸 Pay Bill (GCash / Cash)
# -------------------------------
@bill_bp.route("/bills/pay/<int:bill_id>", methods=["PUT"])
def pay_bill(bill_id):
    try:
        logger.info(f"🔹 Received request to pay bill {bill_id}")
        bill = Bill.query.get(bill_id)

        if not bill:
            return jsonify({"error": "Bill not found"}), 404

        payment_type = request.form.get("paymentType")
        gcash_ref = request.form.get("gcashRef")
        file = request.files.get("gcashReceipt")

        # ✅ Handle Cash payment
        if payment_type == "Cash":
            bill.paymenttype = "Cash"
            bill.gcash_ref = None
            bill.gcash_receipt = None
            logger.info(f"💰 Cash payment for bill {bill_id}")

        # ✅ Handle GCash payment with file upload
        elif payment_type == "GCash":
            bill.paymenttype = "GCash"
            bill.gcash_ref = gcash_ref

            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Add timestamp to avoid filename conflicts
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{timestamp}_{filename}"

                # Save to uploads/gcash_receipts folder
                gcash_folder = os.path.join(current_app.config["UPLOAD_FOLDER"], "gcash_receipts")
                os.makedirs(gcash_folder, exist_ok=True)

                save_path = os.path.join(gcash_folder, filename)
                file.save(save_path)

                bill.gcash_receipt = filename
                logger.info(f"📄 GCash receipt saved: {filename}")
            else:
                return jsonify({"error": "Invalid or missing GCash receipt file"}), 400

        else:
            return jsonify({"error": "Invalid payment type"}), 400

        # ✅ Update bill status
        bill.status = "For Validation"
        
        # ✅ Create notification for tenant
        tenant = Tenant.query.filter_by(tenantid=bill.tenantid).first()
        if tenant:
            tenant_notification = Notification(
                title='Payment Submitted',
                message=f'Your payment for bill #{bill_id} has been submitted and is awaiting validation.',
                targetuserid=tenant.userid,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

        # ✅ Create notification for ALL landlords
        all_landlords = User.query.filter_by(role='Owner').all()
        if all_landlords:
            landlord_notification = Notification(
                title='New Payment Submitted',
                message=f'Tenant has submitted a payment for bill #{bill_id}. Status: For Validation',
                targetuserrole='Owner',
                isgroupnotification=True,
                recipientcount=len(all_landlords),
                createdbyuserid=tenant.userid if tenant else None
            )
            db.session.add(landlord_notification)

        db.session.commit()
        logger.info(f"✅ Bill {bill_id} marked as 'For Validation'")

        return jsonify({"message": "Bill marked as 'For Validation' successfully!"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error updating bill payment: {e}")
        return jsonify({"error": f"Failed to update bill payment: {str(e)}"}), 500


# -------------------------------
# ✅ Approve/Validate Bill Payment
# -------------------------------
@bill_bp.route("/bills/approve/<int:bill_id>", methods=["PUT"])
def approve_bill_payment(bill_id):
    try:
        bill = Bill.query.get(bill_id)
        if not bill:
            return jsonify({"error": "Bill not found"}), 404

        # Update bill status to PAID
        bill.status = "PAID"
        
        # ✅ Create notification for tenant
        tenant = Tenant.query.filter_by(tenantid=bill.tenantid).first()
        if tenant:
            tenant_notification = Notification(
                title='Payment Approved',
                message=f'Your payment for bill #{bill_id} has been approved. Thank you!',
                targetuserid=tenant.userid,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

        db.session.commit()
        logger.info(f"✅ Payment approved for bill {bill_id}")

        return jsonify({"message": "Payment approved successfully!"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error approving payment: {e}")
        return jsonify({"error": f"Failed to approve payment: {str(e)}"}), 500


# -------------------------------
# ❌ Reject Bill Payment
# -------------------------------
@bill_bp.route("/bills/reject/<int:bill_id>", methods=["PUT"])
def reject_bill_payment(bill_id):
    try:
        data = request.get_json()
        reason = data.get("reason", "Payment verification failed")
        
        bill = Bill.query.get(bill_id)
        if not bill:
            return jsonify({"error": "Bill not found"}), 404

        # Update bill status back to Unpaid and clear payment info
        bill.status = "Unpaid"
        bill.paymenttype = None
        bill.gcash_ref = None
        bill.gcash_receipt = None
        
        # ✅ Create notification for tenant
        tenant = Tenant.query.filter_by(tenantid=bill.tenantid).first()
        if tenant:
            tenant_notification = Notification(
                title='Payment Rejected',
                message=f'Your payment for bill #{bill_id} was rejected. Reason: {reason}. Please try again.',
                targetuserid=tenant.userid,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

        db.session.commit()
        logger.info(f"❌ Payment rejected for bill {bill_id}. Reason: {reason}")

        return jsonify({"message": "Payment rejected successfully!"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error rejecting payment: {e}")
        return jsonify({"error": f"Failed to reject payment: {str(e)}"}), 500


# -------------------------------
# 📝 Update bill details
# -------------------------------
@bill_bp.route("/bills/<int:bill_id>", methods=["PUT"])
def update_bill(bill_id):
    try:
        data = request.get_json()
        bill = Bill.query.get(bill_id)
        
        if not bill:
            return jsonify({"error": "Bill not found"}), 404

        # Prevent modification of paid bills
        if bill.status in ["PAID", "For Validation"]:
            return jsonify({"error": "Cannot modify paid or pending validation bills"}), 400

        # Update allowed fields
        updatable_fields = ['amount', 'billtype', 'duedate', 'description', 'status']
        updated_fields = []
        
        for field in updatable_fields:
            if field in data and data[field] is not None:
                # Handle date fields
                if field == 'duedate' and isinstance(data[field], str):
                    try:
                        setattr(bill, field, datetime.strptime(data[field], "%Y-%m-%d").date())
                        updated_fields.append(field)
                    except ValueError:
                        return jsonify({"error": "Invalid date format for due date. Use YYYY-MM-DD"}), 400
                else:
                    setattr(bill, field, data[field])
                    updated_fields.append(field)

        db.session.commit()
        logger.info(f"✅ Bill {bill_id} updated. Fields: {', '.join(updated_fields)}")
        
        return jsonify({
            "message": "Bill updated successfully",
            "updated_fields": updated_fields
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error updating bill {bill_id}: {e}")
        return jsonify({"error": f"Failed to update bill: {str(e)}"}), 500


# -------------------------------
# 🗑️ Delete bill
# -------------------------------
@bill_bp.route("/bills/<int:bill_id>", methods=["DELETE"])
def delete_bill(bill_id):
    try:
        bill = Bill.query.get(bill_id)
        
        if not bill:
            return jsonify({"error": "Bill not found"}), 404

        # Prevent deletion of paid or pending bills
        if bill.status in ["PAID", "For Validation"]:
            return jsonify({"error": "Cannot delete paid or pending validation bills"}), 400

        db.session.delete(bill)
        db.session.commit()
        
        logger.info(f"🗑️ Bill {bill_id} deleted successfully")
        
        return jsonify({"message": "Bill deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error deleting bill {bill_id}: {e}")
        return jsonify({"error": f"Failed to delete bill: {str(e)}"}), 500


# -------------------------------
# 📊 Get billing statistics
# -------------------------------
@bill_bp.route("/billing/statistics", methods=["GET"])
def get_billing_statistics():
    try:
        # Total bills count
        total_bills = Bill.query.count()
        
        # Bills by status
        status_counts = db.session.query(
            Bill.status, 
            db.func.count(Bill.billid)
        ).group_by(Bill.status).all()
        
        # Total revenue from paid bills
        total_revenue = db.session.query(
            db.func.sum(Bill.amount)
        ).filter(Bill.status == 'PAID').scalar() or 0
        
        # Monthly revenue (current year)
        current_year = datetime.now().year
        monthly_revenue = db.session.query(
            db.func.extract('month', Bill.issuedate).label('month'),
            db.func.sum(Bill.amount).label('total')
        ).filter(
            Bill.status == 'PAID',
            db.func.extract('year', Bill.issuedate) == current_year
        ).group_by('month').all()

        statistics = {
            "total_bills": total_bills,
            "status_breakdown": {status: count for status, count in status_counts},
            "total_revenue": float(total_revenue),
            "monthly_revenue": {int(month): float(total) for month, total in monthly_revenue},
            "current_year": current_year
        }

        logger.info("📊 Billing statistics retrieved successfully")
        return jsonify(statistics), 200

    except Exception as e:
        logger.error(f"❌ Error retrieving billing statistics: {e}")
        return jsonify({"error": f"Failed to retrieve billing statistics: {str(e)}"}), 500


# -------------------------------
# 🔍 Search bills with filters
# -------------------------------
@bill_bp.route("/billing/search", methods=["GET"])
def search_bills():
    try:
        # Get query parameters
        tenant_id = request.args.get('tenant_id', type=int)
        status = request.args.get('status')
        bill_type = request.args.get('bill_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Build query
        query = Bill.query
        
        if tenant_id:
            query = query.filter(Bill.tenantid == tenant_id)
        if status:
            query = query.filter(Bill.status == status)
        if bill_type:
            query = query.filter(Bill.billtype == bill_type)
        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Bill.issuedate >= start_date)
        if end_date:
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Bill.issuedate <= end_date)

        bills = query.order_by(Bill.issuedate.desc()).all()

        result = []
        for bill in bills:
            result.append({
                "billid": bill.billid,
                "tenantid": bill.tenantid,
                "issuedate": safe_isoformat(bill.issuedate),
                "duedate": safe_isoformat(bill.duedate),
                "amount": float(bill.amount) if bill.amount else 0,
                "billtype": bill.billtype,
                "status": bill.status,
                "description": bill.description,
                "paymenttype": bill.paymenttype
            })

        logger.info(f"🔍 Search returned {len(result)} bills")
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    except Exception as e:
        logger.error(f"❌ Error searching bills: {e}")
        return jsonify({"error": f"Failed to search bills: {str(e)}"}), 500



# -------------------------------
# 🤖 Automated Bill Detection
# -------------------------------
@bill_bp.route("/billing/automated-detect", methods=["POST"])
def detect_automated_bills():
    try:
        data = request.get_json()
        current_date_str = data.get('currentDate', datetime.now().date().isoformat())
        current_date = datetime.strptime(current_date_str, "%Y-%m-%d").date()
        
        automated_bills = []
        
        # Get all active tenants with contracts
        active_tenants = db.session.query(
            Tenant.tenantid,
            User.firstname,
            User.middlename,
            User.lastname,
            Unit.name.label("unit_name"),
            Unit.price.label("unit_price"),
            Contract.startdate
        ).join(User, Tenant.userid == User.userid)\
         .join(Contract, Tenant.tenantid == Contract.tenantid)\
         .join(Unit, Contract.unitid == Unit.unitid)\
         .filter(Tenant.status == 'Active')\
         .all()

        current_month = current_date.month
        current_year = current_date.year
        
        for tenant in active_tenants:
            tenant_fullname = f"{tenant.firstname} {tenant.middlename + ' ' if tenant.middlename else ''}{tenant.lastname}"
            
            # Check if rent bill already exists for this month
            existing_rent_bill = Bill.query.filter(
                Bill.tenantid == tenant.tenantid,
                Bill.billtype == 'Rent',
                db.extract('month', Bill.issuedate) == current_month,
                db.extract('year', Bill.issuedate) == current_year
            ).first()

            if not existing_rent_bill:
                # Calculate due date (end of current month)
                if current_month == 12:
                    due_date = datetime(current_year + 1, 1, 1) - timedelta(days=1)
                else:
                    due_date = datetime(current_year, current_month + 1, 1) - timedelta(days=1)
                
                automated_bills.append({
                    "tenantId": tenant.tenantid,
                    "tenantName": tenant_fullname,
                    "unitName": tenant.unit_name,
                    "billType": "Rent",
                    "amount": float(tenant.unit_price),
                    "description": f"Monthly rent for {current_date.strftime('%B %Y')}",
                    "issuedDate": current_date.isoformat(),
                    "dueDate": due_date.date().isoformat(),
                    "autoGenerated": True
                })

            # Add logic for other recurring bills (water, electricity, etc.)
            # You can customize this based on your billing cycle
            # Example for water bill (assuming monthly)
            existing_water_bill = Bill.query.filter(
                Bill.tenantid == tenant.tenantid,
                Bill.billtype == 'Water',
                db.extract('month', Bill.issuedate) == current_month,
                db.extract('year', Bill.issuedate) == current_year
            ).first()

            if not existing_water_bill:
                # You can add water bill detection logic here
                # For now, we'll skip it since water bills might not be fixed amounts
                pass

        logger.info(f"🤖 Detected {len(automated_bills)} automated bills for {current_month}/{current_year}")
        return jsonify(automated_bills), 200

    except Exception as e:
        logger.error(f"❌ Error detecting automated bills: {e}")
        return jsonify({"error": f"Failed to detect automated bills: {str(e)}"}), 500

# -------------------------------
# 🤖 Create Automated Bill
# -------------------------------
@bill_bp.route("/billing/create-automated", methods=["POST"])
def create_automated_bill():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['tenantId', 'billType', 'amount', 'issuedDate', 'dueDate']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Parse dates
        issued_date = datetime.strptime(data['issuedDate'], "%Y-%m-%d").date()
        due_date = datetime.strptime(data['dueDate'], "%Y-%m-%d").date()

        # Find contract if exists
        contract = Contract.query.filter_by(tenantid=data['tenantId']).first()
        contractid = contract.contractid if contract else None

        # Create new bill
        new_bill = Bill(
            tenantid=data['tenantId'],
            contractid=contractid,
            issuedate=issued_date,
            duedate=due_date,
            amount=data['amount'],
            billtype=data['billType'],
            status='Unpaid',
            description=data.get('description', ''),
            autogenerated=True
        )
        
        db.session.add(new_bill)
        db.session.flush()

        # Create notification for tenant
        tenant = Tenant.query.filter_by(tenantid=data['tenantId']).first()
        if tenant:
            formatted_amount = f"₱{float(data['amount']):,.2f}"
            due_date_str = due_date.strftime("%Y-%m-%d")
            
            tenant_notification = Notification(
                title='New Automated Bill Issued',
                message=f'New {data["billType"]} bill for {formatted_amount} has been automatically issued. Due date: {due_date_str}',
                targetuserid=tenant.userid,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

        db.session.commit()
        
        logger.info(f"🤖 Automated bill created successfully: ID {new_bill.billid} for tenant {data['tenantId']}")
        
        return jsonify({
            "message": "Automated bill created successfully!",
            "billid": new_bill.billid,
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error creating automated bill: {e}")
        return jsonify({"error": f"Failed to create automated bill: {str(e)}"}), 500

# -------------------------------
# 🤖 Create All Automated Bills
# -------------------------------
@bill_bp.route("/billing/create-all-automated", methods=["POST"])
def create_all_automated_bills():
    try:
        data = request.get_json()
        bills_data = data.get('bills', [])
        created_bills = []

        for bill_data in bills_data:
            # Parse dates
            issued_date = datetime.strptime(bill_data['issuedDate'], "%Y-%m-%d").date()
            due_date = datetime.strptime(bill_data['dueDate'], "%Y-%m-%d").date()

            # Find contract if exists
            contract = Contract.query.filter_by(tenantid=bill_data['tenantId']).first()
            contractid = contract.contractid if contract else None

            # Create new bill
            new_bill = Bill(
                tenantid=bill_data['tenantId'],
                contractid=contractid,
                issuedate=issued_date,
                duedate=due_date,
                amount=bill_data['amount'],
                billtype=bill_data['billType'],
                status='Unpaid',
                description=bill_data.get('description', ''),
                autogenerated=True
            )
            
            db.session.add(new_bill)
            db.session.flush()
            created_bills.append(new_bill.billid)

            # Create notification for tenant
            tenant = Tenant.query.filter_by(tenantid=bill_data['tenantId']).first()
            if tenant:
                formatted_amount = f"₱{float(bill_data['amount']):,.2f}"
                due_date_str = due_date.strftime("%Y-%m-%d")
                
                tenant_notification = Notification(
                    title='New Automated Bill Issued',
                    message=f'New {bill_data["billType"]} bill for {formatted_amount} has been automatically issued. Due date: {due_date_str}',
                    targetuserid=tenant.userid,
                    isgroupnotification=False,
                    recipientcount=1,
                    createdbyuserid=tenant.userid
                )
                db.session.add(tenant_notification)

        db.session.commit()
        
        logger.info(f"🤖 Created {len(created_bills)} automated bills: {created_bills}")
        
        return jsonify({
            "message": f"Successfully created {len(created_bills)} automated bills!",
            "created_bills": created_bills,
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error creating automated bills: {e}")
        return jsonify({"error": f"Failed to create automated bills: {str(e)}"}), 500

# -------------------------------
# 🔍 Check for Duplicate Bills
# -------------------------------
@bill_bp.route("/billing/check-duplicate", methods=["POST"])
def check_duplicate_bill():
    try:
        data = request.get_json()
        tenant_id = data.get('tenantId')
        bill_type = data.get('billType')
        month = data.get('month')
        year = data.get('year')

        if not all([tenant_id, bill_type, month, year]):
            return jsonify({"error": "Missing required fields"}), 400

        # Check for existing bill for the same tenant, type, month, and year
        existing_bill = Bill.query.filter(
            Bill.tenantid == tenant_id,
            Bill.billtype == bill_type,
            db.extract('month', Bill.issuedate) == month,
            db.extract('year', Bill.issuedate) == year
        ).first()

        is_duplicate = existing_bill is not None
        
        result = {
            "isDuplicate": is_duplicate,
            "existingBill": {
                "billid": existing_bill.billid if existing_bill else None,
                "issuedate": safe_isoformat(existing_bill.issuedate) if existing_bill else None,
                "amount": float(existing_bill.amount) if existing_bill else None,
                "status": existing_bill.status if existing_bill else None
            } if existing_bill else None
        }

        logger.info(f"🔍 Duplicate check for tenant {tenant_id}, {bill_type}: {is_duplicate}")
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"❌ Error checking for duplicate bill: {e}")
        return jsonify({"error": f"Failed to check for duplicate bill: {str(e)}"}), 500

# -------------------------------
# ✅ Mark Bill as Paid (for manual marking)
# -------------------------------
@bill_bp.route("/billing/mark-paid/<int:bill_id>", methods=["PUT"])
def mark_bill_as_paid(bill_id):
    try:
        bill = Bill.query.get(bill_id)
        if not bill:
            return jsonify({"error": "Bill not found"}), 404

        # Update bill status to PAID
        bill.status = "PAID"
        bill.paymenttype = "Manual"
        
        # Create notification for tenant
        tenant = Tenant.query.filter_by(tenantid=bill.tenantid).first()
        if tenant:
            tenant_notification = Notification(
                title='Payment Recorded',
                message=f'Your bill #{bill_id} has been marked as paid by the landlord.',
                targetuserid=tenant.userid,
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

        db.session.commit()
        logger.info(f"✅ Bill {bill_id} marked as paid manually")

        return jsonify({"message": "Bill marked as paid successfully!"}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error marking bill as paid: {e}")
        return jsonify({"error": f"Failed to mark bill as paid: {str(e)}"}), 500