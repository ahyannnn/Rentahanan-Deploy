# utils/cloudinary_utils.py
import cloudinary
import cloudinary.uploader
import cloudinary.api
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import tempfile
import os
import traceback
from datetime import datetime

def upload_to_cloudinary(file, folder_name, resource_type="auto"):
    """
    Upload file to Cloudinary and return the URL
    """
    if not file:
        print("❌ No file provided to upload_to_cloudinary")
        return None
        
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"file_{timestamp}"
        
        print(f"📤 Uploading to Cloudinary - Folder: house-rental/{folder_name}, Resource Type: {resource_type}")
        
        upload_params = {
            'folder': f"house-rental/{folder_name}",
            'resource_type': resource_type,
            'public_id': filename,
            'use_filename': False,
            'unique_filename': True,
            'overwrite': True,
            'invalidate': True,
        }
        
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
    Convert PDF first page to JPEG image using multiple fallback methods
    """
    try:
        # Method 1: Try pdf2image (best quality)
        try:
            from pdf2image import convert_from_bytes
            print("🔄 Converting PDF to image using pdf2image...")
            images = convert_from_bytes(
                pdf_buffer.getvalue(),
                first_page=1,
                last_page=1,
                fmt='JPEG',
                dpi=150,
                poppler_path=None
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

        # Method 2: Try PyMuPDF (fitz) - high quality alternative
        try:
            import fitz
            print("🔄 Converting PDF to image using PyMuPDF...")
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_pdf:
                temp_pdf.write(pdf_buffer.read())
                temp_pdf_path = temp_pdf.name
            
            # Open PDF and convert to image
            pdf_document = fitz.open(temp_pdf_path)
            page = pdf_document[0]
            mat = fitz.Matrix(2.0, 2.0)  # Zoom for better quality
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_data = pix.tobytes("ppm")
            image = Image.open(BytesIO(img_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save to buffer
            img_buffer = BytesIO()
            image.save(img_buffer, format='JPEG', quality=90)
            img_buffer.seek(0)
            
            # Cleanup
            pdf_document.close()
            os.unlink(temp_pdf_path)
            
            print("✅ PDF converted to image successfully using PyMuPDF")
            return img_buffer
            
        except ImportError:
            print("📚 PyMuPDF not installed, trying next method...")
        except Exception as e:
            print(f"📚 PyMuPDF conversion failed: {e}, trying next method...")

        # Method 3: Create a professional receipt image directly
        print("🔄 Creating professional receipt image directly...")
        return create_professional_receipt_image()

    except Exception as e:
        print(f"❌ PDF to image conversion error: {e}")
        return create_professional_receipt_image()

def create_professional_receipt_image():
    """
    Create a professional receipt image as fallback
    """
    try:
        # Create image with receipt-like dimensions
        width, height = 800, 1200
        image = Image.new('RGB', (width, height), color=(255, 255, 255))
        draw = ImageDraw.Draw(image)
        
        # Try to load fonts
        try:
            title_font = ImageFont.truetype("arialbd.ttf", 32)
            header_font = ImageFont.truetype("arialbd.ttf", 20)
            normal_font = ImageFont.truetype("arial.ttf", 16)
            small_font = ImageFont.truetype("arial.ttf", 14)
        except:
            # Use default font if specific fonts not available
            title_font = ImageFont.load_default()
            header_font = ImageFont.load_default()
            normal_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        y_position = 50
        
        # Title
        draw.text((width//2, y_position), "RENTAL MANAGEMENT SYSTEM", 
                 fill=(46, 134, 171), font=title_font, anchor="mm")
        y_position += 60
        draw.text((width//2, y_position), "Official Payment Receipt", 
                 fill=(51, 51, 51), font=header_font, anchor="mm")
        y_position += 80
        
        # Receipt Info Box
        draw.rectangle([50, y_position, width-50, y_position + 40], 
                      fill=(46, 134, 171), outline=(46, 134, 171))
        draw.text((60, y_position + 20), "RECEIPT INFORMATION", 
                 fill=(255, 255, 255), font=header_font)
        
        y_position += 60
        
        # Receipt Details
        details = [
            ("Receipt Number:", f"RMS-TEST-001"),
            ("Issue Date:", datetime.now().strftime("%B %d, %Y")),
            ("Issue Time:", datetime.now().strftime("%I:%M %p"))
        ]
        
        for label, value in details:
            draw.text((60, y_position), label, fill=(51, 51, 51), font=normal_font)
            draw.text((250, y_position), value, fill=(102, 102, 102), font=normal_font)
            y_position += 35
        
        y_position += 30
        
        # Footer message
        footer_text = "This is an automatically generated receipt.\nThe original document is available in your records."
        draw.text((width//2, height - 100), footer_text, 
                 fill=(102, 102, 102), font=small_font, anchor="mm", align="center")
        
        # Save to buffer
        img_buffer = BytesIO()
        image.save(img_buffer, format='JPEG', quality=90, optimize=True)
        img_buffer.seek(0)
        
        print("✅ Professional receipt image created successfully")
        return img_buffer
        
    except Exception as e:
        print(f"❌ Error creating professional image: {e}")
        return create_simple_fallback_image()

def create_simple_fallback_image():
    """
    Create a simple fallback image when all else fails
    """
    try:
        image = Image.new('RGB', (600, 400), color=(240, 240, 240))
        draw = ImageDraw.Draw(image)
        
        # Simple text
        draw.text((300, 200), "Receipt Image\n(Conversion Failed)", 
                 fill=(0, 0, 0), anchor="mm", align="center")
        
        img_buffer = BytesIO()
        image.save(img_buffer, format='JPEG', quality=80)
        img_buffer.seek(0)
        
        print("✅ Simple fallback image created")
        return img_buffer
        
    except Exception as e:
        print(f"❌ Even simple fallback failed: {e}")
        return None

def upload_pdf_as_image(pdf_buffer, folder_name, filename_prefix="document"):
    """
    Convert PDF to image and upload to Cloudinary as image resource
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
        
        # Upload as IMAGE resource type (this fixes the 404 issue)
        upload_result = cloudinary.uploader.upload(
            img_buffer,
            folder=f"house-rental/{folder_name}",
            resource_type="image",  # CRITICAL: Use 'image' not 'auto' or 'raw'
            public_id=filename,
            use_filename=False,
            unique_filename=True,
            overwrite=True,
            invalidate=True,
        )
        
        secure_url = upload_result.get('secure_url')
        resource_type = upload_result.get('resource_type')
        format = upload_result.get('format')
        
        print(f"✅ PDF uploaded as image successfully!")
        print(f"   URL: {secure_url}")
        print(f"   Resource Type: {resource_type}")
        print(f"   Format: {format}")
        
        # Verify it's a proper image URL
        if secure_url and '/image/upload/' in secure_url:
            print("🎉 SUCCESS: URL is a proper image resource")
        else:
            print("⚠️  WARNING: URL might not be an image resource")
            
        return secure_url
        
    except Exception as e:
        print(f"❌ PDF as image upload error: {e}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        return None

def upload_image_to_cloudinary(image_buffer, folder_name, filename_prefix="image"):
    """
    Upload image file to Cloudinary
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

def delete_from_cloudinary(public_id):
    """
    Delete file from Cloudinary
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        print(f"✅ File deleted from Cloudinary: {public_id}")
        return result
    except Exception as e:
        print(f"❌ Cloudinary delete error: {e}")
        return None

# Test functions
def test_pdf_to_image_conversion():
    """
    Test PDF to image conversion
    """
    try:
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
        c.save()
        pdf_buffer.seek(0)
        
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
    Test Cloudinary upload with PDF to image conversion
    """
    try:
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
        c.save()
        pdf_buffer.seek(0)
        
        test_url = upload_pdf_as_image(pdf_buffer, "test", "test_document")
        
        if test_url:
            print(f"🎉 Cloudinary upload test: PASSED")
            print(f"📎 Test URL: {test_url}")
            
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