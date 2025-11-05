from flask import Blueprint, jsonify
from extensions import db
from models.users_model import User
from models.tenants_model import Tenant
from models.contracts_model import Contract
from models.units_model import House as Unit
from models.applications_model import Application
from models.bills_model import Bill
from models.notifications_model import Notification
from datetime import datetime

tenant_bp = Blueprint("tenant_bp", __name__)

# Active tenants with contract, unit, and optional application info
@tenant_bp.route("/tenants/active")
def get_active_tenants():
    tenants = (
        db.session.query(
            Application.applicationid,
            User.userid,
            User.firstname,
            User.middlename,
            User.lastname,
            User.email,
            User.phone,
            User.dateofbirth,
            User.street,
            User.barangay,
            User.city,
            User.province,
            User.zipcode,
            User.image,
            Unit.name.label("unit_name"),
            Unit.price.label("unit_price"),
            Application.valid_id,
            Application.brgy_clearance,
            Application.proof_of_income
        )
        .join(Tenant, Tenant.userid == User.userid)
        .join(Contract, Contract.tenantid == Tenant.tenantid)
        .join(Unit, Unit.unitid == Contract.unitid)
        .join(Application, Application.applicationid == Tenant.applicationid)
        .filter(Contract.status == "Active")
        .all()
    )

    result = [
        {
            "applicationid": applicationid,
            "userid":userid,
            "fullname": f"{firstname} {middlename + ' ' if middlename else ''}{lastname}",
            "email": email,
            "phone": phone,
            "dateofbirth": dateofbirth,
            "address": f"{street}, {barangay}, {city}, {province}, {zipcode}",
            "image":image,
            "unit_name": unit_name,
            "unit_price": unit_price,
            "valid_id": valid_id,
            "brgy_clearance": brgy_clearance,
            "proof_of_income": proof_of_income,
        }
        for applicationid, userid, firstname, middlename, lastname, email, phone, dateofbirth, street, barangay, city, province, zipcode, image, unit_name, unit_price, valid_id, brgy_clearance, proof_of_income in tenants
    ]

    return jsonify(result)

@tenant_bp.route("/tenants/applicants")
def get_applicants():
    applicants = (
        db.session.query(
            Application.applicationid,
            User.firstname,
            User.middlename,
            User.lastname,
            User.email,
            User.phone,
            User.dateofbirth,
            User.street,
            User.barangay,
            User.image,
            User.city,
            User.province,
            User.zipcode,
            Unit.name.label("unit_name"),
            Application.valid_id,
            Application.brgy_clearance,
            Application.proof_of_income,
            Application.status.label("application_status"),
            Contract.status.label("contract_status"),
            Bill.status.label("bill_status")
        )
        .join(User, Application.userid == User.userid)
        .outerjoin(Tenant, Tenant.userid == User.userid)
        .outerjoin(Contract, Contract.tenantid == Tenant.tenantid)
        .outerjoin(Unit, Unit.unitid == Application.unitid)
        .outerjoin(Bill, Bill.tenantid == Tenant.tenantid)
        .filter(Application.status == "Pending")
        .all()
    )

    result = []
    for a in applicants:
        contract_signed = a.contract_status == "Signed"

        result.append({
            "applicationid": a.applicationid,
            "fullname": f"{a.firstname} {a.middlename + ' ' if a.middlename else ''}{a.lastname}",
            "email": a.email,
            "phone": a.phone,
            "image": a.image,
            "dateofbirth": a.dateofbirth,
            "address": f"{a.street}, {a.barangay}, {a.city}, {a.province}, {a.zipcode}",
            "unit_name": a.unit_name,
            "valid_id": a.valid_id,
            "brgy_clearance": a.brgy_clearance,
            "proof_of_income": a.proof_of_income,
            "application_status": a.application_status,
            "contract_status": a.contract_status or "Unsigned",
            "bill_status": a.bill_status or "Unpaid",
            "contract_signed": contract_signed
        })

    return jsonify(result)

@tenant_bp.route("/tenants/approve/<int:application_id>", methods=["PUT"])
def approve_applicant(application_id):
    try:
        # Fetch the application
        application = Application.query.get(application_id)
        if not application:
            return jsonify({"success": False, "message": "Application not found"}), 404

        # Fetch the tenant linked to this application
        tenant = Tenant.query.filter_by(applicationid=application_id).first()
        if not tenant:
            return jsonify({"success": False, "message": "Tenant not found"}), 404

        # Fetch the contract linked to this tenant
        contract = Contract.query.filter_by(tenantid=tenant.tenantid).first()
        if not contract:
            return jsonify({"success": False, "message": "Contract not found"}), 404

        # Ensure contract is signed
        if contract.status != "Signed":
            return jsonify({"success": False, "message": "Contract not signed yet"}), 400

        # Optional: check initial payment
        paid_bill = Bill.query.filter_by(tenantid=tenant.tenantid, status="Paid").first()
        if not paid_bill:
            return jsonify({"success": False, "message": "Initial payment not completed"}), 400
        
        unit = Unit.query.filter_by(unitid=contract.unitid).first()
        if not unit:
            return jsonify({"success": False, "message": "unit not found"}), 404

        # Update statuses
        application.status = "Approved"
        contract.status = "Active"
        tenant.status = "Active"  # ✅ ADDED: Set tenant status to Active
        unit.status = "Occupied"

        # ✅ Create UNIFIED notification for tenant
        tenant_notification = Notification(
            title='Application Approved!',
            message='Congratulations! Your rental application has been approved. You can now move into your unit.',
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
                title='Tenant Application Approved',
                message=f'Tenant application #{application_id} has been approved and is now active.',
                targetuserrole='Owner',  # Target all landlords
                isgroupnotification=True,
                recipientcount=len(all_landlords),
                createdbyuserid=tenant.userid
            )
            db.session.add(landlord_notification)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Application {application_id} approved and contract activated successfully."
        })

    except Exception as e:
        db.session.rollback()
        print("❌ ERROR approving applicant:", e)
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": f"Failed to approve application: {str(e)}"}), 500

# Reject an applicant
@tenant_bp.route("/tenants/reject/<int:application_id>", methods=["PUT"])
def reject_applicant(application_id):
    try:
        application = Application.query.get(application_id)

        if not application:
            return jsonify({"success": False, "message": "Application not found"}), 404

        # Update status to Rejected and set other fields to NULL
        application.status = "Rejected"
        application.unitid = None
        application.valid_id = None
        application.brgy_clearance = None
        application.proof_of_income = None

        # ✅ Get tenant info for notification
        tenant = Tenant.query.filter_by(applicationid=application_id).first()
        if tenant:
            # ✅ Create UNIFIED notification for tenant
            tenant_notification = Notification(
                title='Application Status Update',
                message='Your rental application has been reviewed. Unfortunately, it was not approved.',
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
                    title='Tenant Application Rejected',
                    message=f'Tenant application #{application_id} has been rejected.',
                    targetuserrole='Owner',  # Target all landlords
                    isgroupnotification=True,
                    recipientcount=len(all_landlords),
                    createdbyuserid=tenant.userid
                )
                db.session.add(landlord_notification)

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Application {application_id} rejected successfully."
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to reject application: {str(e)}"}), 500