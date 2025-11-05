from flask import Blueprint, request, jsonify
from extensions import db
from models.concerns_model import Concern
from models.notifications_model import Notification
import requests
import os
from datetime import datetime
from models.users_model import User
from models.units_model import House
from models.tenants_model import Tenant
from models.applications_model import Application

concern_bp = Blueprint("concern_bp", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_to_cloudinary(file, folder_name):
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

# ✅ Memory storage for deleted concerns (NO DATABASE CHANGES)
deleted_concerns_tracker = {
    'tenant': set(),
    'landlord': set()
}

# ✅ Add new concern (Tenant)
@concern_bp.route("/add-concerns", methods=["POST"])
def add_concern():
    try:
        data = request.form
        tenantid = data.get("tenantid")
        concerntype = data.get("concerntype")
        subject = data.get("subject")
        description = data.get("description")

        if not tenantid or not concerntype or not subject or not description:
            return jsonify({"error": "All required fields must be provided"}), 400

        # Handle tenant image upload with Cloudinary
        tenantimage_url = None
        if "tenantimage" in request.files:
            file = request.files["tenantimage"]
            if file and allowed_file(file.filename):
                tenantimage_url = upload_to_cloudinary(file, "concern_images")
                if not tenantimage_url:
                    return jsonify({"error": "Failed to upload concern image"}), 500

        new_concern = Concern(
            tenantid=tenantid,
            concerntype=concerntype,
            subject=subject,
            description=description,
            tenantimage=tenantimage_url,  # Now storing Cloudinary URL
            status="Pending",
            creationdate=datetime.utcnow()
        )

        db.session.add(new_concern)
        db.session.flush()  # Get concern ID without committing

        # ✅ Get tenant info for notification
        tenant = Tenant.query.filter_by(tenantid=tenantid).first()
        if tenant:
            # ✅ Create UNIFIED notification for tenant
            tenant_notification = Notification(
                title='Concern Submitted',
                message=f'Your {concerntype} concern "{subject}" has been submitted successfully. We will review it soon.',
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
                    title='New Concern Reported',
                    message=f'New {concerntype} concern reported by tenant: "{subject}"',
                    targetuserrole='Owner',  # Target all landlords
                    isgroupnotification=True,
                    recipientcount=len(all_landlords),
                    createdbyuserid=tenant.userid
                )
                db.session.add(landlord_notification)

        db.session.commit()

        return jsonify({
            "message": "Concern submitted successfully",
            "concern": new_concern.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print("Error adding concern:", e)
        return jsonify({"error": "Failed to submit concern"}), 500

# ✅ Get ALL concerns (for landlord view) - Filter deleted ones
@concern_bp.route("/concerns", methods=["GET"])
def get_all_concerns():
    try:
        results = (
            db.session.query(
                Concern.concernid,
                Concern.concerntype,
                Concern.subject,
                Concern.description,
                Concern.status,
                Concern.creationdate,
                Concern.tenantimage,
                Concern.landlordimage,
                User.firstname,
                User.lastname,
                House.name.label("unit_name")
            )
            .join(Tenant, Tenant.tenantid == Concern.tenantid)
            .join(User, User.userid == Tenant.userid)
            .outerjoin(Application, Application.applicationid == Tenant.applicationid)
            .outerjoin(House, House.unitid == Application.unitid)
            .order_by(Concern.creationdate.desc())
            .all()
        )

        concerns_list = []
        for c in results:
            # Check if landlord deleted this concern
            if c.concernid in deleted_concerns_tracker['landlord']:
                continue  # Skip if landlord deleted it

            fullname = f"{c.firstname} {c.lastname}".strip()

            concerns_list.append({
                "id": c.concernid,
                "concerntype": c.concerntype,
                "subject": c.subject,
                "description": c.description,
                "image": c.tenantimage,  # Now Cloudinary URL
                "landlordimage": c.landlordimage,  # Now Cloudinary URL
                "status": c.status,
                "creationdate": c.creationdate.isoformat() if c.creationdate else None,
                "tenant_name": fullname,
                "unit": c.unit_name if c.unit_name else "",
            })

        return jsonify(concerns_list), 200

    except Exception as e:
        print("Error fetching concerns:", e)
        return jsonify({"error": str(e)}), 500

# ✅ Get concerns per tenant - Filter deleted ones
@concern_bp.route("/get-concerns/<int:tenantid>", methods=["GET"])
def get_concerns(tenantid):
    try:
        concerns = Concern.query.filter_by(tenantid=tenantid).order_by(Concern.creationdate.desc()).all()

        result = []
        for c in concerns:
            # Check if tenant deleted this concern
            if c.concernid in deleted_concerns_tracker['tenant']:
                continue  # Skip if tenant deleted it

            concern_dict = {
                "concernid": c.concernid,
                "tenantid": c.tenantid,
                "concerntype": c.concerntype,
                "subject": c.subject,
                "description": c.description,
                "tenantimage": c.tenantimage,  # Now Cloudinary URL
                "landlordimage": c.landlordimage,  # Now Cloudinary URL
                "status": c.status,
                "creationdate": c.creationdate.isoformat() if c.creationdate else None,
                "resolutiondate": c.resolutiondate.isoformat() if c.resolutiondate else None
            }
            result.append(concern_dict)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Update concern (Landlord marks resolved & uploads fix image)
@concern_bp.route("/concerns/<int:concernid>", methods=["PUT"])
def update_concern(concernid):
    try:
        concern = Concern.query.get(concernid)
        if not concern:
            return jsonify({"error": "Concern not found"}), 404

        data = request.form
        status = data.get("status", concern.status)

        landlordimage_url = concern.landlordimage
        if "landlordimage" in request.files:
            file = request.files["landlordimage"]
            if file and allowed_file(file.filename):
                landlordimage_url = upload_to_cloudinary(file, "concern_images")
                if not landlordimage_url:
                    return jsonify({"error": "Failed to upload fix image"}), 500

        # ✅ Enforce that Resolved requires a landlord image
        if status.lower() == "resolved" and not landlordimage_url:
            return jsonify({"error": "Cannot mark as resolved without uploading a fix photo"}), 400

        old_status = concern.status
        concern.status = status
        concern.landlordimage = landlordimage_url
        
        # Update resolution date if resolved
        if status.lower() == "resolved" and not concern.resolutiondate:
            concern.resolutiondate = datetime.utcnow()

        # ✅ Get tenant info for notification
        tenant = Tenant.query.filter_by(tenantid=concern.tenantid).first()
        if tenant and old_status != status:
            status_messages = {
                "In Progress": f'Your concern "{concern.subject}" is now being addressed.',
                "Resolved": f'Your concern "{concern.subject}" has been resolved! Thank you for your patience.',
                "Pending": f'Your concern "{concern.subject}" status has been updated to pending review.'
            }

            message = status_messages.get(status, f'Your concern status has been updated to {status}.')

            # ✅ Create UNIFIED notification for tenant
            tenant_notification = Notification(
                title=f'Concern {status}',
                message=message,
                targetuserid=tenant.userid,  # Specific to this tenant
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

            # ✅ Create UNIFIED notification for ALL landlords for important status changes
            if status in ["Resolved", "In Progress"]:
                all_landlords = User.query.filter_by(role='Owner').all()
                if all_landlords:
                    landlord_notification = Notification(
                        title=f'Concern {status}',
                        message=f'Concern "{concern.subject}" has been marked as {status}.',
                        targetuserrole='Owner',  # Target all landlords
                        isgroupnotification=True,
                        recipientcount=len(all_landlords),
                        createdbyuserid=tenant.userid
                    )
                    db.session.add(landlord_notification)

        db.session.commit()

        return jsonify({
            "message": "Concern updated successfully",
            "concern": {
                "concernid": concern.concernid,
                "tenantid": concern.tenantid,
                "concerntype": concern.concerntype,
                "subject": concern.subject,
                "description": concern.description,
                "tenantimage": concern.tenantimage,
                "landlordimage": concern.landlordimage,
                "status": concern.status,
                "creationdate": concern.creationdate.isoformat() if concern.creationdate else None,
                "resolutiondate": concern.resolutiondate.isoformat() if concern.resolutiondate else None
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print("Error updating concern:", e)
        return jsonify({"error": "Failed to update concern"}), 500

# ✅ Soft delete concern (Tenant side only) - NO DATABASE CHANGES
@concern_bp.route("/delete-concern-tenant/<int:concernid>", methods=["DELETE"])
def delete_concern_tenant(concernid):
    try:
        concern = Concern.query.get(concernid)
        if not concern:
            return jsonify({"error": "Concern not found"}), 404

        # Add to tenant's deleted list (NO DATABASE CHANGE)
        deleted_concerns_tracker['tenant'].add(concernid)
        
        # Check if both deleted for image deletion
        if concernid in deleted_concerns_tracker['landlord']:
            # Both deleted - we could delete from Cloudinary here if needed
            # But Cloudinary files are safe to keep for reference
            return jsonify({
                "message": "Concern permanently deleted from both views",
                "permanent_delete": True
            }), 200
        else:
            # Only tenant deleted
            return jsonify({
                "message": "Concern deleted successfully from your view",
                "permanent_delete": False
            }), 200

    except Exception as e:
        print("Error in soft delete:", e)
        return jsonify({"error": "Failed to delete concern"}), 500

# ✅ Soft delete concern (Landlord side only) - NO DATABASE CHANGES
@concern_bp.route("/delete-concern-landlord/<int:concernid>", methods=["DELETE"])
def delete_concern_landlord(concernid):
    try:
        concern = Concern.query.get(concernid)
        if not concern:
            return jsonify({"error": "Concern not found"}), 404

        # Add to landlord's deleted list (NO DATABASE CHANGE)
        deleted_concerns_tracker['landlord'].add(concernid)
        
        # Check if both deleted for image deletion
        if concernid in deleted_concerns_tracker['tenant']:
            # Both deleted - we could delete from Cloudinary here if needed
            # But Cloudinary files are safe to keep for reference
            return jsonify({
                "message": "Concern permanently deleted from both views",
                "permanent_delete": True
            }), 200
        else:
            # Only landlord deleted
            return jsonify({
                "message": "Concern deleted successfully from landlord view",
                "permanent_delete": False
            }), 200

    except Exception as e:
        print("Error in soft delete:", e)
        return jsonify({"error": "Failed to delete concern"}), 500

# ✅ Delete concern images when both parties delete (Updated for Cloudinary)
def delete_concern_images(concern):
    try:
        # With Cloudinary, we don't need to manually delete files
        # Cloudinary handles storage management automatically
        # Images remain accessible via their URLs
        
        print(f"✅ Both parties deleted concern #{concern.concernid}")
        print(f"Note: Cloudinary images are preserved for reference")

    except Exception as e:
        print(f"Error in concern cleanup: {e}")

# ✅ Reset deleted concerns (for testing)
@concern_bp.route("/reset-deleted-concerns", methods=["POST"])
def reset_deleted_concerns():
    deleted_concerns_tracker['tenant'].clear()
    deleted_concerns_tracker['landlord'].clear()
    return jsonify({"message": "Deleted concerns reset successfully"}), 200

# ✅ Add comment/response to concern (for landlords)
@concern_bp.route("/concerns/<int:concernid>/comment", methods=["POST"])
def add_concern_comment(concernid):
    try:
        data = request.get_json()
        comment = data.get("comment")
        
        if not comment:
            return jsonify({"error": "Comment is required"}), 400

        concern = Concern.query.get(concernid)
        if not concern:
            return jsonify({"error": "Concern not found"}), 404

        # Update concern with comment (you might want to add a comments field to your model)
        # For now, we'll just send a notification
        
        # ✅ Get tenant info for notification
        tenant = Tenant.query.filter_by(tenantid=concern.tenantid).first()
        if tenant:
            # ✅ Create UNIFIED notification for tenant
            tenant_notification = Notification(
                title='Update on Your Concern',
                message=f'New update on your concern "{concern.subject}": {comment}',
                targetuserid=tenant.userid,  # Specific to this tenant
                isgroupnotification=False,
                recipientcount=1,
                createdbyuserid=tenant.userid
            )
            db.session.add(tenant_notification)

        db.session.commit()

        return jsonify({
            "message": "Comment added successfully",
            "concernid": concernid
        }), 200

    except Exception as e:
        db.session.rollback()
        print("Error adding comment:", e)
        return jsonify({"error": "Failed to add comment"}), 500

# ✅ Get concern details by ID
@concern_bp.route("/concerns/<int:concernid>", methods=["GET"])
def get_concern_details(concernid):
    try:
        concern = Concern.query.get(concernid)
        if not concern:
            return jsonify({"error": "Concern not found"}), 404

        # Get tenant and unit info
        tenant = Tenant.query.filter_by(tenantid=concern.tenantid).first()
        user = User.query.filter_by(userid=tenant.userid).first() if tenant else None
        
        unit_name = None
        if tenant and tenant.applicationid:
            application = Application.query.filter_by(applicationid=tenant.applicationid).first()
            if application and application.unitid:
                unit = House.query.filter_by(unitid=application.unitid).first()
                unit_name = unit.name if unit else None

        concern_data = {
            "concernid": concern.concernid,
            "tenantid": concern.tenantid,
            "concerntype": concern.concerntype,
            "subject": concern.subject,
            "description": concern.description,
            "tenantimage": concern.tenantimage,  # Cloudinary URL
            "landlordimage": concern.landlordimage,  # Cloudinary URL
            "status": concern.status,
            "creationdate": concern.creationdate.isoformat() if concern.creationdate else None,
            "resolutiondate": concern.resolutiondate.isoformat() if concern.resolutiondate else None,
            "tenant_name": f"{user.firstname} {user.lastname}" if user else "Unknown",
            "unit_name": unit_name
        }

        return jsonify(concern_data), 200

    except Exception as e:
        print("Error fetching concern details:", e)
        return jsonify({"error": "Failed to fetch concern details"}), 500