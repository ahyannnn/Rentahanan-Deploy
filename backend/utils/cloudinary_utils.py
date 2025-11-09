import cloudinary.uploader
import cloudinary.api

def upload_to_cloudinary(file, folder_name, resource_type="auto"):
    """
    Upload file to Cloudinary and return the URL
    
    Args:
        file: File object from request.files
        folder_name: Folder name in Cloudinary (will be under house-rental/)
        resource_type: "auto" for both images and documents, "image" for images only
    
    Returns:
        str: Secure URL of the uploaded file or None if failed
    """
    if not file:
        return None
        
    try:
        result = cloudinary.uploader.upload(
            file,
            folder=f"house-rental/{folder_name}",
            resource_type=resource_type
        )
        print(f"✅ File uploaded successfully to Cloudinary: {result['secure_url']}")
        return result['secure_url']
            
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
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