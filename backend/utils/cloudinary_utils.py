# Updated cloudinary_utils.py
import cloudinary.uploader
import cloudinary.api
from io import BytesIO
import traceback
from datetime import datetime
import re

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
        # Determine the actual resource type
        final_resource_type = resource_type
        is_pdf = False
        
        # Detect file type
        if resource_type == "auto":
            if isinstance(file, BytesIO):
                # Check if it's a PDF by reading the header
                current_pos = file.tell()
                file.seek(0)
                header = file.read(4)
                file.seek(current_pos)
                if header == b'%PDF':
                    final_resource_type = "raw"
                    is_pdf = True
                    print("🔍 Detected PDF file - using 'raw' resource type")
                else:
                    final_resource_type = "image"
                    print("🔍 Detected image file - using 'image' resource type")
            elif hasattr(file, 'filename') and file.filename:
                if file.filename.lower().endswith('.pdf'):
                    final_resource_type = "raw"
                    is_pdf = True
                    print("🔍 Detected PDF file - using 'raw' resource type")
                else:
                    final_resource_type = "image"
                    print("🔍 Detected image file - using 'image' resource type")
            else:
                # Default to image for unknown files
                final_resource_type = "image"
                print("🔍 Unknown file type - defaulting to 'image' resource type")
        elif resource_type == "raw":
            is_pdf = True
            print("🔍 Explicit raw upload - treating as PDF")
        
        print(f"📤 Uploading to Cloudinary - Folder: house-rental/{folder_name}, Resource Type: {final_resource_type}")
        
        # Generate a unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if is_pdf:
            filename = f"document_{timestamp}"
        else:
            filename = f"image_{timestamp}"
        
        # Upload parameters
        upload_params = {
            'folder': f"house-rental/{folder_name}",
            'resource_type': final_resource_type,
            'public_id': filename,
            'use_filename': False,
            'unique_filename': True,
            'overwrite': True,
            'invalidate': True,
            'type': 'upload'
        }
        
        # Handle file upload
        if isinstance(file, BytesIO):
            file.seek(0)
            upload_result = cloudinary.uploader.upload(file, **upload_params)
        else:
            if hasattr(file, 'stream'):
                file.stream.seek(0)
            upload_result = cloudinary.uploader.upload(file, **upload_params)
        
        secure_url = upload_result.get('secure_url')
        public_id = upload_result.get('public_id')
        actual_resource_type = upload_result.get('resource_type')
        version = upload_result.get('version')
        
        print(f"✅ File uploaded successfully to Cloudinary:")
        print(f"   URL: {secure_url}")
        print(f"   Public ID: {public_id}")
        print(f"   Version: {version}")
        print(f"   Resource Type: {actual_resource_type}")
        print(f"   Format: {upload_result.get('format')}")
        
        # Fix URL for PDF files to ensure proper raw format
        if is_pdf and secure_url:
            # Force raw upload URL structure for PDFs
            if '/image/upload/' in secure_url:
                secure_url = secure_url.replace('/image/upload/', '/raw/upload/')
                print(f"🔄 Fixed resource type in URL: {secure_url}")
            
            # Ensure PDF URLs have the correct structure
            if '/raw/upload/' not in secure_url:
                if version and public_id:
                    # Manual URL construction for PDFs
                    secure_url = f"https://res.cloudinary.com/dm9eein09/raw/upload/v{version}/{public_id}"
                    print(f"🔄 Manually constructed PDF URL: {secure_url}")
                else:
                    # Fallback extraction
                    match = re.search(r'v(\d+)/(.+)', secure_url)
                    if match:
                        version = match.group(1)
                        file_path = match.group(2)
                        secure_url = f"https://res.cloudinary.com/dm9eein09/raw/upload/v{version}/{file_path}"
            
            # Ensure PDF URLs end with .pdf
            if not secure_url.endswith('.pdf'):
                secure_url += '.pdf'
                
            print(f"🔧 Final PDF URL: {secure_url}")
        
        return secure_url
            
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return None

def upload_pdf_to_cloudinary(file_buffer, folder_name, filename_prefix="document"):
    """
    Specialized function for uploading PDF files with proper configuration
    
    Args:
        file_buffer: BytesIO buffer containing PDF data
        folder_name: Folder name in Cloudinary
        filename_prefix: Prefix for the filename
    
    Returns:
        str: Secure URL of the uploaded PDF or None if failed
    """
    try:
        # Verify it's a PDF
        file_buffer.seek(0)
        header = file_buffer.read(4)
        file_buffer.seek(0)
        
        if header != b'%PDF':
            print("❌ File is not a valid PDF")
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}"
        
        print(f"📤 Uploading PDF to Cloudinary - Folder: house-rental/{folder_name}")
        
        # Upload with explicit PDF configuration
        upload_result = cloudinary.uploader.upload(
            file_buffer,
            folder=f"house-rental/{folder_name}",
            resource_type="raw",
            public_id=filename,
            use_filename=False,
            unique_filename=True,
            overwrite=True,
            invalidate=True,
            type='upload'
        )
        
        secure_url = upload_result.get('secure_url')
        public_id = upload_result.get('public_id')
        version = upload_result.get('version')
        
        print(f"✅ PDF uploaded successfully:")
        print(f"   Original URL: {secure_url}")
        print(f"   Public ID: {public_id}")
        print(f"   Version: {version}")
        
        # Manually construct the proper PDF URL
        if secure_url and version and public_id:
            # Always use manual construction for PDFs to prevent stream URLs
            secure_url = f"https://res.cloudinary.com/dm9eein09/raw/upload/v{version}/{public_id}.pdf"
            print(f"🔧 Constructed PDF URL: {secure_url}")
        elif secure_url:
            # Fallback: fix any incorrect URLs
            if '/image/upload/' in secure_url:
                secure_url = secure_url.replace('/image/upload/', '/raw/upload/')
            if '/download/' in secure_url:
                secure_url = secure_url.replace('/download/', '/upload/')
            if not secure_url.endswith('.pdf'):
                secure_url += '.pdf'
            print(f"🔧 Fixed PDF URL: {secure_url}")
        
        return secure_url
        
    except Exception as e:
        print(f"❌ PDF upload error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return None

def delete_from_cloudinary(public_id):
    """
    Delete file from Cloudinary
    
    Args:
        public_id: Cloudinary public ID of the file to delete
    
    Returns:
        dict: Cloudinary deletion result or None if failed
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        print(f"✅ File deleted from Cloudinary: {public_id}")
        return result
    except Exception as e:
        print(f"❌ Cloudinary delete error: {e}")
        return None