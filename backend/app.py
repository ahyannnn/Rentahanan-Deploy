from flask import Flask, jsonify, send_from_directory, current_app, request
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db
from models.units_model import House
from datetime import datetime, timedelta
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

# ✅ CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://rentahanan.vercel.app", 
            "http://localhost:5173", 
            "http://localhost:3000",
            "http://localhost:5174"  # Added another common dev port
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": [
            "Content-Type", 
            "Authorization", 
            "X-Requested-With",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Headers"
        ],
        "supports_credentials": True,
        "expose_headers": ["Content-Disposition"]  # For file downloads
    }
})

# ✅ Config
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Handle database URL format for Render
database_url = os.getenv("DATABASE_URL")
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # Added for performance
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["BREVO_API_KEY"] = os.getenv("BREVO_API_KEY")
app.config["UPLOAD_FOLDER"] = os.path.join(BASE_DIR, "uploads")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-this")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 3600  # 1 hour in seconds

# ✅ Cloudinary Configuration
app.config["CLOUDINARY_CLOUD_NAME"] = os.getenv("CLOUDINARY_CLOUD_NAME")
app.config["CLOUDINARY_API_KEY"] = os.getenv("CLOUDINARY_API_KEY")
app.config["CLOUDINARY_API_SECRET"] = os.getenv("CLOUDINARY_API_SECRET")

# Validate Cloudinary configuration
cloudinary_config_valid = all([
    app.config["CLOUDINARY_CLOUD_NAME"],
    app.config["CLOUDINARY_API_KEY"], 
    app.config["CLOUDINARY_API_SECRET"]
])

if not cloudinary_config_valid:
    print("⚠️  Warning: Cloudinary configuration is incomplete. File uploads may not work.")
else:
    # Configure Cloudinary
    cloudinary.config(
        cloud_name=app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=app.config["CLOUDINARY_API_KEY"],
        api_secret=app.config["CLOUDINARY_API_SECRET"],
        secure=True  # Always use HTTPS
    )
    print("✅ Cloudinary configured successfully")

jwt = JWTManager(app)

# ✅ Initialize and register
db.init_app(app)

# Register blueprints
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

# ✅ Cloudinary Upload Route (Keep for backward compatibility)
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
            'folder': folder,
            'resource_type': result.get('resource_type', 'auto')
        }), 200
        
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        return jsonify({
            'error': 'File upload failed',
            'details': str(e)
        }), 500

# ✅ Cloudinary Delete Route (Optional - for cleanup)
@app.route("/api/delete-file", methods=["POST"])
def delete_file():
    """
    Delete file from Cloudinary
    Expects: public_id = Cloudinary public ID
    """
    data = request.get_json()
    public_id = data.get('public_id')
    
    if not public_id:
        return jsonify({'error': 'No public ID provided'}), 400
    
    try:
        result = cloudinary.uploader.destroy(public_id)
        if result.get('result') == 'ok':
            return jsonify({
                'success': True, 
                'message': 'File deleted successfully'
            }), 200
        else:
            return jsonify({
                'error': 'File deletion failed', 
                'result': result
            }), 400
    except Exception as e:
        print(f"❌ Cloudinary delete error: {e}")
        return jsonify({
            'error': 'File deletion failed',
            'details': str(e)
        }), 500

# ✅ Health check route with detailed status
@app.route("/health")
def health_check():
    try:
        # Test database connection
        db.session.execute('SELECT 1')
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Test Cloudinary connection
    cloudinary_status = "healthy" if cloudinary_config_valid else "unconfigured"
    
    return jsonify({
        "status": "running",
        "database": db_status,
        "cloudinary": cloudinary_status,
        "timestamp": datetime.now().isoformat()
    })

# ✅ Simple test routes
@app.route("/api/houses", methods=["GET"])
def get_houses():
    try:
        houses = House.query.all()
        return jsonify([h.to_dict() for h in houses])
    except Exception as e:
        return jsonify({"error": f"Failed to fetch houses: {str(e)}"}), 500

@app.route("/api/ping")
def ping():
    return jsonify({"message": "pong", "timestamp": datetime.now().isoformat()})

@app.route("/")
def home():
    return jsonify({
        "message": "Flask backend is running!",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "ping": "/api/ping",
            "docs": "Available at /api/* endpoints"
        }
    })

# ✅ Development-only route for local file serving
@app.route("/uploads/<path:subpath>/<path:filename>")
def serve_uploads(subpath, filename):
    # This will only work in development
    if os.environ.get('FLASK_ENV') == 'development':
        full_path = os.path.join(current_app.config["UPLOAD_FOLDER"], subpath)
        if os.path.exists(full_path) and os.path.exists(os.path.join(full_path, filename)):
            return send_from_directory(full_path, filename)
    return jsonify({
        'error': 'File not found in production - use Cloudinary URLs',
        'note': 'All files are stored in Cloudinary in production'
    }), 404

# ✅ Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "message": "The requested endpoint does not exist"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Internal server error",
        "message": "Something went wrong on our end"
    }), 500

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        "error": "Method not allowed",
        "message": "The HTTP method is not supported for this endpoint"
    }), 405

# ✅ Create uploads directory if it doesn't exist (for development)
if not os.path.exists(app.config["UPLOAD_FOLDER"]):
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

if __name__ == "__main__":
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created/verified")
        except Exception as e:
            print(f"⚠️  Database initialization warning: {e}")
    
    # Get port from environment variable (Render provides this)
    port = int(os.environ.get("PORT", 10000))
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"🚀 Starting Flask server on port {port} (debug: {debug_mode})")
    print(f"📁 Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"☁️  Cloudinary: {'Configured' if cloudinary_config_valid else 'Not configured'}")
    
    app.run(host="0.0.0.0", port=port, debug=debug_mode)