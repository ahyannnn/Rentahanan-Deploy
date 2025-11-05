from flask import Blueprint, request, jsonify, current_app
import requests
import os
from datetime import datetime
from extensions import db
from models.applications_model import Application
from models.users_model import User
from models.units_model import House as Unit
from models.notifications_model import Notification

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

    def upload_to_cloudinary(file, folder_name, prefix):
        """Upload file to Cloudinary and return the URL"""
        if not file:
            return None
            
        try:
            # Make request to our own upload endpoint
            upload_response = requests.post(
                f"{request.url_root}api/upload",
                files={'file': file},
                data={'folder': folder_name}
            )
            
            if upload_response.status_code == 200:
                data = upload_response.json()
                return data['url']  # Return Cloudinary URL
            else:
                print(f"Upload failed: {upload_response.json()}")
                return None
                
        except Exception as e:
            print(f"Cloudinary upload error: {e}")
            return None

    try:
        # Upload files to Cloudinary
        valid_id_url = upload_to_cloudinary(valid_id_file, "valid_ids", "validid")
        brgy_url = upload_to_cloudinary(brgy_file, "brgy_clearances", "brgy") if brgy_file else None
        proof_url = upload_to_cloudinary(proof_file, "proof_of_income", "proof") if proof_file else None

        if not valid_id_url:
            return jsonify({"error": "Failed to upload valid ID"}), 500

        # Check if application exists
        application = Application.query.filter_by(userid=user_id).first()
        application_id = None

        if application:
            application.unitid = unit_id
            application.valid_id = valid_id_url  # Now storing URL instead of filename
            application.brgy_clearance = brgy_url
            application.proof_of_income = proof_url
            application.status = "Pending"
            application.submissiondate = datetime.utcnow()
            application_id = application.applicationid
        else:
            new_app = Application(
                unitid=unit_id,
                userid=user.userid,
                valid_id=valid_id_url,  # Now storing URL instead of filename
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
        # No need to cleanup files since they're in Cloudinary
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
        "valid_id_url": application.valid_id,  # Now returns Cloudinary URL
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