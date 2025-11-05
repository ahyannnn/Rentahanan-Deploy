from flask import Flask, jsonify, request, send_from_directory, current_app
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db
from models.units_model import House
import os
from flask_jwt_extended import JWTManager
from routes.auth_route import auth_bp
from routes.application_route import application_bp
from routes.tenant_route import tenant_bp
from routes.bill_route import bill_bp
from routes.contract_route import contract_bp
from routes.forgot_route import forgot_bp
from routes.units_route import houses_bp
from routes.transaction_route import transaction_bp
from routes.concern_route import concern_bp
from routes.profile_route import profile_bp
from routes.notification_route import notification_bp
from routes.tenant_dashboard_route import tenant_dashboard_bp
from routes.email_verification_bp import email_verification_bp
from routes.owner_dashboard_route import owner_dashboard_bp

# Cloudinary imports
import cloudinary
import cloudinary.uploader
import cloudinary.api

load_dotenv()

app = Flask(__name__)

# ✅ Update CORS for production - allow both localhost and Netlify
frontend_url = os.getenv("FRONTEND_URL", "https://your-frontend-name.netlify.app")
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",  # Local development
            frontend_url,  # Your Netlify domain
            "https://your-frontend-name.netlify.app"  # Direct URL
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# ✅ Config
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Handle database URL format for Render
database_url = os.getenv("DATABASE_URL")
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["BREVO_API_KEY"] = os.getenv("BREVO_API_KEY")
app.config["UPLOAD_FOLDER"] = os.path.join(BASE_DIR, "uploads")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-this")

# ✅ Cloudinary Configuration
app.config["CLOUDINARY_CLOUD_NAME"] = os.getenv("CLOUDINARY_CLOUD_NAME")
app.config["CLOUDINARY_API_KEY"] = os.getenv("CLOUDINARY_API_KEY")
app.config["CLOUDINARY_API_SECRET"] = os.getenv("CLOUDINARY_API_SECRET")

# Configure Cloudinary
cloudinary.config(
    cloud_name=app.config["CLOUDINARY_CLOUD_NAME"],
    api_key=app.config["CLOUDINARY_API_KEY"],
    api_secret=app.config["CLOUDINARY_API_SECRET"]
)

jwt = JWTManager(app)

# ✅ Initialize and register
db.init_app(app)
app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(application_bp, url_prefix="/api")
app.register_blueprint(tenant_bp, url_prefix="/api")
app.register_blueprint(bill_bp, url_prefix="/api")
app.register_blueprint(contract_bp, url_prefix="/api")
app.register_blueprint(forgot_bp, url_prefix="/api")
app.register_blueprint(houses_bp, url_prefix="/api")
app.register_blueprint(transaction_bp, url_prefix="/api")
app.register_blueprint(concern_bp, url_prefix="/api")
app.register_blueprint(profile_bp, url_prefix="/api")
app.register_blueprint(notification_bp, url_prefix="/api")
app.register_blueprint(email_verification_bp, url_prefix="/api")
app.register_blueprint(tenant_dashboard_bp, url_prefix="/api")
app.register_blueprint(owner_dashboard_bp, url_prefix="/api")

# ✅ Cloudinary Upload Route
@app.route("/api/upload", methods=["POST"])
def upload_file():
    """
    Universal file upload endpoint for all file types
    Expects: file = file to upload, folder = folder name in Cloudinary
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    folder = request.form.get('folder', 'house-rental')  # Default folder
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder=f"house-rental/{folder}",
            resource_type="auto"  # Handles both images and documents (PDFs)
        )
        
        return jsonify({
            'success': True,
            'url': result['secure_url'],
            'public_id': result['public_id'],
            'folder': folder
        }), 200
        
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return jsonify({'error': 'File upload failed'}), 500

# Example routes
@app.route("/api/houses", methods=["GET"])
def get_houses():
    houses = House.query.all()
    return jsonify([h.to_dict() for h in houses])

@app.route("/api/ping")
def ping():
    return jsonify({"message": "pong"})

@app.route("/")
def home():
    return jsonify({"message": "Flask backend is running!"})

# ✅ Health check route for Render
@app.route("/health")
def health_check():
    return jsonify({"status": "healthy", "message": "Backend is running"})

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    
    # Get port from environment variable (Render provides this)
    port = int(os.environ.get("PORT", 10000))
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    
    app.run(host="0.0.0.0", port=port, debug=debug_mode)