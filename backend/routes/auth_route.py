from flask import Blueprint, request, jsonify
from extensions import db
from models.users_model import User
from models.applications_model import Application
from models.tenants_model import Tenant
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth_bp", __name__)

# ==============================
# CHECK EMAIL AVAILABILITY
# ==============================
@auth_bp.route("/check-email", methods=["POST"])
def check_email():
    data = request.get_json()
    if not data:
        return jsonify({"message": "No JSON received"}), 400

    email = data.get("email")
    if not email:
        return jsonify({"message": "Email is required"}), 400

    # Check if email exists
    user = User.query.filter_by(email=email).first()
    
    return jsonify({
        "exists": user is not None
    }), 200

# ==============================
# REGISTER
# ==============================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"message": "No JSON received"}), 400

    # Extract user fields
    firstname = data.get("firstname")
    middlename = data.get("middlename")
    lastname = data.get("lastname")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")
    dateofbirth = data.get("dob")
    street = data.get("street")
    barangay = data.get("barangay")
    city = data.get("city")
    province = data.get("province")
    zipcode = data.get("zipcode")

    # Validation: ensure all required fields are filled
    if not all([firstname, lastname, email, phone, password, dateofbirth, street, barangay, city, province, zipcode]):
        return jsonify({"message": "All fields are required"}), 400

    # Check if email already exists
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 400

    try:
        # --- Hash password ---
        hashed_password = generate_password_hash(password)

        # --- Create User ---
        new_user = User(
            firstname=firstname,
            middlename=middlename,
            lastname=lastname,
            email=email,
            password=hashed_password,
            phone=phone,
            dateofbirth=dateofbirth,
            street=street,
            barangay=barangay,
            city=city,
            province=province,
            zipcode=zipcode,
            role="Tenant",
            image=None,
            datecreated=datetime.utcnow()
        )

        db.session.add(new_user)
        db.session.flush()  # Get new_user.userid

        # --- Create Application ---
        new_application = Application(
            unitid=None,
            status="Registered",
            submissiondate=datetime.utcnow(),
            userid=new_user.userid,
            valid_id=None,
            brgy_clearance=None,
            proof_of_income=None
        )

        db.session.add(new_application)
        db.session.flush()  # Get new_application.applicationid

        # --- Create Tenant ---
        new_tenant = Tenant(
            userid=new_user.userid,
            applicationid=new_application.applicationid,
            status="Registered"  # ✅ ADDED: Set the status for new tenants
        )

        db.session.add(new_tenant)

        # --- Commit all changes ---
        db.session.commit()

        return jsonify({"message": "User, application, and tenant created successfully!"}), 201

    except Exception as e:
        # --- Rollback on any error ---
        db.session.rollback()
        print("Registration error:", str(e))
        return jsonify({"message": f"Registration failed: {str(e)}"}), 500

# ==============================
# LOGIN
# ==============================
@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return jsonify({"status": "OK"}), 200

    data = request.get_json()
    if not data:
        return jsonify({"message": "No JSON received"}), 400

    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"message": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    if not user.check_password(password):
        return jsonify({"message": "Incorrect password"}), 401

    application = Application.query.filter_by(userid=user.userid).first()
    
    # ✅ Debug: Check what's happening with tenant lookup
    print(f"Looking for tenant with userid: {user.userid} (type: {type(user.userid)})")
    
    tenant = Tenant.query.filter_by(userid=user.userid).first()
    
    print(f"Tenant found: {tenant}")
    if tenant:
        print(f"Tenant ID: {tenant.tenantid}")
        print(f"Tenant UserID: {tenant.userid} (type: {type(tenant.userid)})")
        print(f"Tenant Status: {tenant.status}")  # ✅ Added status debug
    else:
        print("❌ NO TENANT RECORD FOUND!")

    # ✅ Generate JWT token
    access_token = create_access_token(
        identity={
            "userid": user.userid,
            "role": user.role,
            "tenantid": tenant.tenantid if tenant else None
        },
        expires_delta=timedelta(hours=1)
    )

    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "user": {
            "userid": user.userid,
            "firstname": user.firstname,
            "lastname": user.lastname,
            "middlename": user.middlename,
            "email": user.email,
            "role": user.role,
            "application_status": application.status if application else "No Application",
            "tenant_status": tenant.status if tenant else "No Tenant"  # ✅ Added tenant status
        }
    }), 200