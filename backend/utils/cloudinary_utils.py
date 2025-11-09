# Updated cloudinary_utils.py
import cloudinary.uploader
import cloudinary.api
from io import BytesIO
import traceback

def upload_to_cloudinary(file, folder_name, resource_type="auto"):
    """
    Upload file to Cloudinary and return the URL
    
    Args:
        file: File object from request.files or BytesIO
        folder_name: Folder name in Cloudinary (will be under house-rental/)
        resource_type: "auto" for both images and documents, "image" for images only
    
    Returns:
        str: Secure URL of the uploaded file or None if failed
    """
    if not file:
        print("❌ No file provided to upload_to_cloudinary")
        return None
        
    try:
        # Determine resource type
        final_resource_type = resource_type
        
        # Auto-detect PDF files and use "raw" resource type
        if resource_type == "auto":
            if isinstance(file, BytesIO):
                # Check if it's a PDF by reading the header
                current_pos = file.tell()
                file.seek(0)
                header = file.read(4)
                file.seek(current_pos)
                if header == b'%PDF':
                    final_resource_type = "raw"
                    print("🔍 Detected PDF file - using 'raw' resource type")
            elif hasattr(file, 'filename') and file.filename:
                if file.filename.lower().endswith('.pdf'):
                    final_resource_type = "raw"
                    print("🔍 Detected PDF file - using 'raw' resource type")
        
        print(f"📤 Uploading to Cloudinary - Folder: house-rental/{folder_name}, Resource Type: {final_resource_type}")
        
        # Handle file upload based on type
        if isinstance(file, BytesIO):
            file.seek(0)  # Ensure we're at the start
            upload_result = cloudinary.uploader.upload(
                file,
                folder=f"house-rental/{folder_name}",
                resource_type=final_resource_type,
                use_filename=True,
                unique_filename=True,
                overwrite=True
            )
        else:
            # Handle file objects from request.files
            if hasattr(file, 'stream'):
                file.stream.seek(0)
            upload_result = cloudinary.uploader.upload(
                file,
                folder=f"house-rental/{folder_name}",
                resource_type=final_resource_type,
                use_filename=True,
                unique_filename=True,
                overwrite=True
            )
        
        secure_url = upload_result.get('secure_url')
        public_id = upload_result.get('public_id')
        actual_resource_type = upload_result.get('resource_type')
        
        print(f"✅ File uploaded successfully to Cloudinary:")
        print(f"   URL: {secure_url}")
        print(f"   Public ID: {public_id}")
        print(f"   Resource Type: {actual_resource_type}")
        print(f"   Format: {upload_result.get('format')}")
        print(f"   Size: {upload_result.get('bytes', 0)} bytes")
        
        return secure_url
            
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return None