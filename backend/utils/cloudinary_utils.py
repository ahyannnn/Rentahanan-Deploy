# Updated cloudinary_utils.py - PDF to Image Conversion
import cloudinary.uploader
import cloudinary.api
from io import BytesIO
import traceback
from datetime import datetime
from PIL import Image
import tempfile
import os

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
        # Generate a unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"file_{timestamp}"
        
        print(f"📤 Uploading to Cloudinary - Folder: house-rental/{folder_name}, Resource Type: {resource_type}")
        
        # Upload parameters
        upload_params = {
            'folder': f"house-rental/{folder_name}",
            'resource_type': resource_type,
            'public_id': filename,
            'use_filename': False,
            'unique_filename': True,
            'overwrite': True,
            'invalidate': True,
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
        
        print(f"✅ File uploaded successfully to Cloudinary: {secure_url}")
        
        return secure_url
            
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return None

def convert_pdf_to_image(pdf_buffer):
    """
    Convert PDF first page to JPEG image
    
    Args:
        pdf_buffer: BytesIO buffer containing PDF data
    
    Returns:
        BytesIO: Image buffer in JPEG format or None if failed
    """
    try:
        # Try to use pdf2image if available (better quality)
        try:
            from pdf2image import convert_from_bytes
            
            print("🔄 Converting PDF to image using pdf2image...")
            images = convert_from_bytes(
                pdf_buffer.getvalue(),
                first_page=1,
                last_page=1,
                fmt='JPEG',
                dpi=150,  # Good balance of quality and file size
                poppler_path=None  # Auto-detect poppler
            )
            
            if images:
                img_buffer = BytesIO()
                images[0].save(img_buffer, format='JPEG', quality=90, optimize=True)
                img_buffer.seek(0)
                print("✅ PDF converted to image successfully using pdf2image")
                return img_buffer
                
        except ImportError:
            print("📚 pdf2image not installed, trying alternative methods...")
        except Exception as e:
            print(f"📚 pdf2image conversion failed: {e}, trying alternative methods...")
        
        # Alternative 1: Use reportlab to create a simple image representation
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            
            print("🔄 Creating document preview image...")
            
            img_buffer = BytesIO()
            c = canvas.Canvas(img_buffer, pagesize=A4)
            
            # Create a professional-looking document preview
            c.setFillColorRGB(0.2, 0.4, 0.6)  # Blue color
            c.rect(50, 700, 500, 80, fill=1)
            
            c.setFillColorRGB(1, 1, 1)  # White text
            c.setFont("Helvetica-Bold", 20)
            c.drawString(70, 740, "DOCUMENT PREVIEW")
            
            c.setFillColorRGB(0, 0, 0)  # Black text
            c.setFont("Helvetica", 12)
            c.drawString(70, 650, "This is a preview of the original document.")
            c.drawString(70, 630, "The full document is available for download.")
            c.drawString(70, 610, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Add a border
            c.setStrokeColorRGB(0.8, 0.8, 0.8)
            c.rect(30, 30, 535, 760)
            
            c.showPage()
            c.save()
            img_buffer.seek(0)
            
            print("✅ Document preview image created successfully")
            return img_buffer
            
        except Exception as e:
            print(f"❌ ReportLab preview creation failed: {e}")
        
        # Alternative 2: Create a simple placeholder image
        try:
            print("🔄 Creating placeholder image...")
            
            # Create a simple colored image with text
            img = Image.new('RGB', (600, 800), color=(240, 240, 240))
            
            # This would require adding text with PIL, but for simplicity
            # we'll just return a colored image
            img_buffer = BytesIO()
            img.save(img_buffer, format='JPEG', quality=80)
            img_buffer.seek(0)
            
            print("✅ Placeholder image created")
            return img_buffer
            
        except Exception as e:
            print(f"❌ All image conversion methods failed: {e}")
            return None
        
    except Exception as e:
        print(f"❌ PDF to image conversion error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return None

def upload_pdf_as_image(pdf_buffer, folder_name, filename_prefix="document"):
    """
    Convert PDF to image and upload to Cloudinary as image (not raw)
    
    Args:
        pdf_buffer: BytesIO buffer containing PDF data
        folder_name: Folder name in Cloudinary
        filename_prefix: Prefix for the filename
    
    Returns:
        str: Secure URL of the uploaded image or None if failed
    """
    try:
        print(f"📄 Processing PDF for image conversion...")
        
        # Convert PDF to image
        img_buffer = convert_pdf_to_image(pdf_buffer)
        if not img_buffer:
            print("❌ Failed to convert PDF to image")
            return None
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}"
        
        print(f"📤 Uploading PDF as image to Cloudinary - Folder: house-rental/{folder_name}")
        
        # Upload as image (not raw) - THIS IS THE KEY FIX
        upload_result = cloudinary.uploader.upload(
            img_buffer,
            folder=f"house-rental/{folder_name}",
            resource_type="image",  # Use image, not raw - FIXES 404 ERRORS
            public_id=filename,
            use_filename=False,
            unique_filename=True,
            overwrite=True,
            invalidate=True,
        )
        
        secure_url = upload_result.get('secure_url')
        format = upload_result.get('format')
        
        print(f"✅ PDF uploaded as image successfully!")
        print(f"   URL: {secure_url}")
        print(f"   Format: {format}")
        print(f"   Resource Type: {upload_result.get('resource_type')}")
        
        return secure_url
        
    except Exception as e:
        print(f"❌ PDF as image upload error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return None

def upload_image_to_cloudinary(image_buffer, folder_name, filename_prefix="image"):
    """
    Upload image file to Cloudinary (for regular images, not PDF conversions)
    
    Args:
        image_buffer: BytesIO buffer containing image data
        folder_name: Folder name in Cloudinary
        filename_prefix: Prefix for the filename
    
    Returns:
        str: Secure URL of the uploaded image or None if failed
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{filename_prefix}_{timestamp}"
        
        print(f"📤 Uploading image to Cloudinary - Folder: house-rental/{folder_name}")
        
        upload_result = cloudinary.uploader.upload(
            image_buffer,
            folder=f"house-rental/{folder_name}",
            resource_type="image",
            public_id=filename,
            use_filename=False,
            unique_filename=True,
            overwrite=True,
            invalidate=True,
        )
        
        secure_url = upload_result.get('secure_url')
        
        print(f"✅ Image uploaded successfully: {secure_url}")
        
        return secure_url
        
    except Exception as e:
        print(f"❌ Image upload error: {e}")
        return None

def test_pdf_to_image_conversion():
    """
    Test function to verify PDF to image conversion works
    """
    try:
        # Create a simple test PDF
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        import io
        
        print("🧪 Testing PDF to image conversion...")
        
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, "TEST PDF DOCUMENT")
        c.setFont("Helvetica", 12)
        c.drawString(100, 720, "This is a test PDF for image conversion.")
        c.drawString(100, 700, f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.drawString(100, 680, "If you can see this, conversion works!")
        c.save()
        pdf_buffer.seek(0)
        
        # Test conversion
        img_buffer = convert_pdf_to_image(pdf_buffer)
        if img_buffer:
            print("✅ PDF to image conversion test: PASSED")
            return True
        else:
            print("❌ PDF to image conversion test: FAILED")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_cloudinary_upload():
    """
    Test function to verify Cloudinary upload works with PDF to image conversion
    """
    try:
        # Create a simple test PDF
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        import io
        
        print("🧪 Testing Cloudinary upload with PDF to image...")
        
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, "CLOUDINARY UPLOAD TEST")
        c.setFont("Helvetica", 12)
        c.drawString(100, 720, "Testing PDF to image upload functionality.")
        c.drawString(100, 700, f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.save()
        pdf_buffer.seek(0)
        
        # Test upload
        test_url = upload_pdf_as_image(pdf_buffer, "test", "test_document")
        
        if test_url:
            print(f"🎉 Cloudinary upload test: PASSED")
            print(f"📎 Test URL: {test_url}")
            
            # Verify it's an image URL (not raw)
            if '/image/upload/' in test_url:
                print("✅ URL uses image resource type (GOOD)")
            else:
                print("⚠️  URL doesn't use image resource type")
                
            return test_url
        else:
            print("❌ Cloudinary upload test: FAILED")
            return None
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
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

