from flask import Blueprint, request, jsonify
from datetime import datetime
from extensions import db
from models.applications_model import Application
from models.users_model import User
from models.units_model import House as Unit
from models.notifications_model import Notification
from utils.cloudinary_utils import upload_to_cloudinary  # Import the shared utility

application_bp = Blueprint("application_bp", __name__)

@application_bp.route("/apply", methods=["POST"])
def apply_unit():
    user_id = request.form.get("tenant_id")
    unit_id = request.form.get("unit_id")

    # Get uploaded files
    valid_id_file = request.files.get("validId")
    brgy_file = request.files.get("brgyClearance")
    proof_file = request.files.get("proofOfIncome")

    if not user_id or not unit_id or not valid_id_file:
        return jsonify({"error": "Missing required fields"}), 400

    # Get user info
    user = User.query.filter_by(userid=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get ALL landlords in the system
    all_landlords = User.query.filter_by(role='Owner').all()

    try:
        # Upload files to Cloudinary using the shared utility
        # Use "auto" resource_type to handle both images and PDFs
        valid_id_url = upload_to_cloudinary(valid_id_file, "application_docs/valid_ids", "auto")
        brgy_url = upload_to_cloudinary(brgy_file, "application_docs/brgy_clearances", "auto") if brgy_file else None
        proof_url = upload_to_cloudinary(proof_file, "application_docs/proof_of_income", "auto") if proof_file else None

        if not valid_id_url:
            return jsonify({"error": "Failed to upload valid ID"}), 500

        # Check if application exists
        application = Application.query.filter_by(userid=user_id).first()
        application_id = None

        if application:
            application.unitid = unit_id
            application.valid_id = valid_id_url
            application.brgy_clearance = brgy_url
            application.proof_of_income = proof_url
            application.status = "Pending"
            application.submissiondate = datetime.utcnow()
            application_id = application.applicationid
        else:
            new_app = Application(
                unitid=unit_id,
                userid=user.userid,
                valid_id=valid_id_url,
                brgy_clearance=brgy_url,
                proof_of_income=proof_url,
                status="Pending",
                submissiondate=datetime.utcnow()
            )
            db.session.add(new_app)
            db.session.flush()
            application_id = new_app.applicationid

        # ✅ Create UNIFIED notification for ALL landlords (single notification)
        if all_landlords:
            landlord_notification = Notification(
                title='New Rental Application',
                message=f'{user.firstname} {user.lastname} has submitted a new rental application. Application ID: #{application_id}',
                targetuserrole='Owner',  # Target all landlords
                isgroupnotification=True,
                recipientcount=len(all_landlords),
                createdbyuserid=user_id  # The tenant who created the application
            )
            db.session.add(landlord_notification)

        # ✅ Create individual notification for tenant
        tenant_notification = Notification(
            title='Application Submitted',
            message=f'Your rental application has been submitted successfully. Application ID: #{application_id}',
            targetuserid=user_id,  # Specific to this tenant
            isgroupnotification=False,
            recipientcount=1,
            createdbyuserid=user_id
        )
        db.session.add(tenant_notification)

        db.session.commit()
        return jsonify({"message": "Application submitted successfully!", "application_id": application_id})

    except Exception as e:
        db.session.rollback()
        print(f"Error submitting application: {str(e)}")
        return jsonify({"error": f"Failed to submit application: {str(e)}"}), 500

# ✅ Fetch application details
@application_bp.route("/application/<int:tenant_id>", methods=["GET"])
def get_application(tenant_id):
    # Get application
    application = Application.query.filter_by(userid=tenant_id).first()
    
    if not application:
        return jsonify({"error": "No application found for this user"}), 404

    # Get user for fullname, email, phone
    user = User.query.filter_by(userid=tenant_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Combine data
    return jsonify({
        "userid": user.userid,
        "fullName": f"{user.firstname} {user.middlename or ''} {user.lastname}".strip(),
        "email": user.email,
        "phone": user.phone,
        "status": application.status,
        "unitid": application.unitid,
        "valid_id_url": application.valid_id,  # Cloudinary URL
        "brgy_clearance_url": application.brgy_clearance,
        "proof_of_income_url": application.proof_of_income
    })

@application_bp.route("/applicants/for-billing", methods=["GET"])
def get_applicants_for_billing():
    try:
        # Fetch approved applications
        approved_applicants = (
            db.session.query(
                Application.applicationid,
                User.userid,
                User.firstname,
                User.middlename,
                User.lastname,
                User.email,
                User.phone,
                Unit.name.label("unit_name"),
                Unit.price.label("unit_price"),
                Application.status
            )
            .join(User, User.userid == Application.userid)
            .join(Unit, Unit.unitid == Application.unitid)
            .filter(Application.status == "Pending")  # Only pending applicants
            .all()
        )

        if not approved_applicants:
            return jsonify([])  # No applicants

        # Format results
        result = []
        for (
            applicationid,
            userid,
            firstname,
            middlename,
            lastname,
            email,
            phone,
            unit_name,
            unit_price,
            status
        ) in approved_applicants:
            result.append({
                "applicationid": applicationid,
                "userid": userid,
                "fullname": f"{firstname} {middlename + ' ' if middlename else ''}{lastname}",
                "email": email,
                "phone": phone,
                "unit_name": unit_name,
                "unit_price": unit_price,
                "status": status,
                "estimated_bill": unit_price * 3  # Assuming bill is based on unit price
            })

        return jsonify(result)

    except Exception as e:
        print("❌ Error fetching applicants for billing:", e)
        return jsonify({"error": str(e)}), 500

# ✅ New route to get application documents
@application_bp.route("/application/<int:tenant_id>/documents", methods=["GET"])
def get_application_documents(tenant_id):
    """Get all documents for an application"""
    application = Application.query.filter_by(userid=tenant_id).first()
    
    if not application:
        return jsonify({"error": "No application found"}), 404

    documents = {}
    if application.valid_id:
        documents["valid_id"] = application.valid_id
    if application.brgy_clearance:
        documents["brgy_clearance"] = application.brgy_clearance
    if application.proof_of_income:
        documents["proof_of_income"] = application.proof_of_income

    return jsonify(documents)

# ✅ Additional route to get all applications (for admin/landlord view)
@application_bp.route("/applications", methods=["GET"])
def get_all_applications():
    try:
        applications = (
            db.session.query(
                Application,
                User,
                Unit
            )
            .join(User, User.userid == Application.userid)
            .join(Unit, Unit.unitid == Application.unitid)
            .all()
        )

        result = []
        for application, user, unit in applications:
            result.append({
                "application_id": application.applicationid,
                "user_id": user.userid,
                "full_name": f"{user.firstname} {user.middlename or ''} {user.lastname}".strip(),
                "email": user.email,
                "phone": user.phone,
                "unit_id": unit.unitid,
                "unit_name": unit.name,
                "unit_price": float(unit.price) if unit.price else 0,
                "status": application.status,
                "submission_date": application.submissiondate.isoformat() if application.submissiondate else None,
                "valid_id_url": application.valid_id,
                "brgy_clearance_url": application.brgy_clearance,
                "proof_of_income_url": application.proof_of_income
            })

        return jsonify(result), 200

    except Exception as e:
        print("Error fetching all applications:", e)
        return jsonify({"error": "Failed to fetch applications"}), 500

# ✅ Route to update application status
@application_bp.route("/application/<int:application_id>/status", methods=["PUT"])
def update_application_status(application_id):
    try:
        data = request.get_json()
        new_status = data.get("status")
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        application = Application.query.get(application_id)
        if not application:
            return jsonify({"error": "Application not found"}), 404

        # Update status
        application.status = new_status
        db.session.commit()

        return jsonify({
            "message": "Application status updated successfully!",
            "application": {
                "application_id": application.applicationid,
                "status": application.status
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print("Error updating application status:", e)
        return jsonify({"error": "Failed to update application status"}), 500