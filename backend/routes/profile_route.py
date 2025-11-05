from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.users_model import User
from models.applications_model import Application
from models.tenants_model import Tenant
import requests
import os
from datetime import datetime

profile_bp = Blueprint("profile_bp", __name__)

# Allowed image extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

@profile_bp.route("/profile/<int:user_id>", methods=["PUT"])
def update_user_profile(user_id):
    try:
        # Find user
        user = User.query.filter_by(userid=user_id).first()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Get form data - ONLY editable fields
        email = request.form.get("email")
        phone = request.form.get("phone")
        
        # Get uploaded file
        image_file = request.files.get("image")

        # Validate required fields
        if not email or not phone:
            return jsonify({"success": False, "message": "Email and phone are required"}), 400

        # Check if email is already taken by another user
        existing_user = User.query.filter(User.email == email, User.userid != user_id).first()
        if existing_user:
            return jsonify({"success": False, "message": "Email already taken by another user"}), 400

        image_url = None

        # Handle image upload with Cloudinary
        if image_file and image_file.filename:
            if not allowed_file(image_file.filename):
                return jsonify({"success": False, "message": "Invalid file type. Allowed types: PNG, JPG, JPEG, GIF, BMP, WEBP"}), 400

            # Upload new image to Cloudinary
            image_url = upload_to_cloudinary(image_file, "profile_images")
            if not image_url:
                return jsonify({"success": False, "message": "Failed to upload profile image"}), 500

        # Update ONLY editable fields
        user.email = email
        user.phone = phone
        
        # Only update image if a new one was uploaded
        if image_url:
            user.image = image_url  # Store Cloudinary URL

        db.session.commit()

        # Return updated user data
        updated_user = {
            "userid": user.userid,
            "firstname": user.firstname,
            "middlename": user.middlename,
            "lastname": user.lastname,
            "email": user.email,
            "phone": user.phone,
            "dateofbirth": user.dateofbirth.isoformat() if user.dateofbirth else None,
            "street": user.street,
            "barangay": user.barangay,
            "city": user.city,
            "province": user.province,
            "zipcode": user.zipcode,
            "role": user.role,
            "image": user.image,  # Now Cloudinary URL
            "datecreated": user.datecreated.isoformat() if user.datecreated else None
        }

        return jsonify({
            "success": True, 
            "message": "Profile updated successfully",
            "user": updated_user
        })

    except Exception as e:
        db.session.rollback()
        print("Error updating profile:", str(e))
        return jsonify({"success": False, "message": f"Failed to update profile: {str(e)}"}), 500

@profile_bp.route("/profile/<int:user_id>", methods=["GET"])
def get_user_profile(user_id):
    try:
        # Query user with related tenant data
        user_data = (
            db.session.query(
                User,
                Tenant.tenantid,
                Tenant.status,  # ✅ ADDED: Include tenant status
                Application.status.label("application_status")
            )
            .outerjoin(Tenant, Tenant.userid == User.userid)
            .outerjoin(Application, Application.userid == User.userid)
            .filter(User.userid == user_id)
            .first()
        )

        if not user_data:
            return jsonify({"success": False, "message": "User not found"}), 404

        # ✅ UPDATED: Unpack all four values including tenant status
        user, tenantid, tenant_status, application_status = user_data

        profile = {
            "userid": user.userid,
            "tenantid": tenantid,  # ✅ Include tenantid
            "status": tenant_status or "Pending",  # ✅ ADDED: Include tenant status with fallback
            "firstname": user.firstname,
            "middlename": user.middlename,
            "lastname": user.lastname,
            "email": user.email,
            "phone": user.phone if user.phone else "N/A",
            "dateofbirth": user.dateofbirth.isoformat() if user.dateofbirth else None,
            "street": user.street,
            "barangay": user.barangay,
            "city": user.city,
            "province": user.province,
            "zipcode": user.zipcode,
            "role": user.role,
            "image": user.image,  # Now Cloudinary URL
            "datecreated": user.datecreated.isoformat() if user.datecreated else None,
            "application_status": application_status or "Registered"
        }

        return jsonify({"success": True, "profile": profile})

    except Exception as e:
        print("Error fetching user profile:", str(e))
        return jsonify({"success": False, "message": f"Failed to fetch profile: {str(e)}"}), 500

# ✅ Upload profile image only (separate endpoint)
@profile_bp.route("/profile/<int:user_id>/image", methods=["POST"])
def upload_profile_image(user_id):
    try:
        # Find user
        user = User.query.filter_by(userid=user_id).first()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Get uploaded file
        image_file = request.files.get("image")
        if not image_file or not image_file.filename:
            return jsonify({"success": False, "message": "No image file provided"}), 400

        if not allowed_file(image_file.filename):
            return jsonify({"success": False, "message": "Invalid file type. Allowed types: PNG, JPG, JPEG, GIF, BMP, WEBP"}), 400

        # Upload image to Cloudinary
        image_url = upload_to_cloudinary(image_file, "profile_images")
        if not image_url:
            return jsonify({"success": False, "message": "Failed to upload profile image"}), 500

        # Update user image
        user.image = image_url
        db.session.commit()

        return jsonify({
            "success": True, 
            "message": "Profile image updated successfully",
            "image_url": image_url
        })

    except Exception as e:
        db.session.rollback()
        print("Error uploading profile image:", str(e))
        return jsonify({"success": False, "message": f"Failed to upload profile image: {str(e)}"}), 500

# ✅ Delete profile image
@profile_bp.route("/profile/<int:user_id>/image", methods=["DELETE"])
def delete_profile_image(user_id):
    try:
        # Find user
        user = User.query.filter_by(userid=user_id).first()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        if not user.image:
            return jsonify({"success": False, "message": "No profile image to delete"}), 400

        # With Cloudinary, we don't need to manually delete the file
        # The image remains in Cloudinary but is no longer linked to the user
        user.image = None
        db.session.commit()

        return jsonify({
            "success": True, 
            "message": "Profile image removed successfully"
        })

    except Exception as e:
        db.session.rollback()
        print("Error deleting profile image:", str(e))
        return jsonify({"success": False, "message": f"Failed to remove profile image: {str(e)}"}), 500

# ✅ Get multiple user profiles (for admin/landlord view)
@profile_bp.route("/profiles", methods=["GET"])
def get_multiple_profiles():
    try:
        user_ids = request.args.getlist('user_ids[]')
        
        if not user_ids:
            return jsonify({"success": False, "message": "No user IDs provided"}), 400

        # Convert to integers
        try:
            user_ids = [int(uid) for uid in user_ids]
        except ValueError:
            return jsonify({"success": False, "message": "Invalid user ID format"}), 400

        users = User.query.filter(User.userid.in_(user_ids)).all()

        profiles = []
        for user in users:
            profile = {
                "userid": user.userid,
                "firstname": user.firstname,
                "middlename": user.middlename,
                "lastname": user.lastname,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "image": user.image,  # Cloudinary URL
                "datecreated": user.datecreated.isoformat() if user.datecreated else None
            }
            profiles.append(profile)

        return jsonify({"success": True, "profiles": profiles})

    except Exception as e:
        print("Error fetching multiple profiles:", str(e))
        return jsonify({"success": False, "message": f"Failed to fetch profiles: {str(e)}"}), 500

# ✅ Update user address
@profile_bp.route("/profile/<int:user_id>/address", methods=["PUT"])
def update_user_address(user_id):
    try:
        # Find user
        user = User.query.filter_by(userid=user_id).first()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        data = request.get_json()
        
        # Update address fields
        if 'street' in data:
            user.street = data['street']
        if 'barangay' in data:
            user.barangay = data['barangay']
        if 'city' in data:
            user.city = data['city']
        if 'province' in data:
            user.province = data['province']
        if 'zipcode' in data:
            user.zipcode = data['zipcode']

        db.session.commit()

        return jsonify({
            "success": True, 
            "message": "Address updated successfully",
            "address": {
                "street": user.street,
                "barangay": user.barangay,
                "city": user.city,
                "province": user.province,
                "zipcode": user.zipcode
            }
        })

    except Exception as e:
        db.session.rollback()
        print("Error updating address:", str(e))
        return jsonify({"success": False, "message": f"Failed to update address: {str(e)}"}), 500