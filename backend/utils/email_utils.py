import os
import random
import time
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from dotenv import load_dotenv

load_dotenv()

# -------------------
# Brevo (Sendinblue) Setup
# -------------------
BREVO_API_KEY = os.getenv("BREVO_API_KEY")

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key["api-key"] = BREVO_API_KEY

# Temporary in-memory storage for verification codes (for password reset only)
# Structure: { email: {"code": "123456", "timestamp": 1234567890} }
verification_codes = {}

# -------------------
# Utility Functions
# -------------------
def generate_code():
    """Generate a random 6-digit code."""
    return str(random.randint(100000, 999999))


def send_password_reset_email(email):
    """
    Send password reset verification code via Brevo.
    Returns True if successful, False otherwise.
    """
    code = generate_code()

    # Save code + timestamp
    verification_codes[email] = {
        "code": code,
        "timestamp": time.time()
    }

    html_content = f"""
<div style="
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    background-color: #f4f6f8;
    padding: 40px 0;
">
    <div style="
        max-width: 600px;
        margin: auto;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        border: 1px solid #e0e0e0;
    ">

        <!-- HEADER -->
        <div style="
            background-color: #0048b4;
            color: white;
            padding: 20px 30px;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            text-align: center;
        ">
            <h1 style="font-size: 22px; font-weight: 600; margin: 0;">
                Password Reset Verification
            </h1>
        </div>

        <!-- BODY -->
        <div style="padding: 30px 40px;">
            <p style="font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 20px;">
                Hello,
                <br><br>
                We received a request to reset your password. Please use the verification code below to proceed with your request:
            </p>

            <div style="text-align: center; margin: 35px 0;">
                <span style="
                    display: inline-block;
                    background-color: #0048b4;
                    color: white;
                    font-size: 26px;
                    font-weight: 700;
                    letter-spacing: 6px;
                    padding: 15px 40px;
                    border-radius: 6px;
                ">
                    {code}
                </span>
            </div>

            <p style="font-size: 14px; color: #666; line-height: 1.6;">
                This code will expire in <strong>15 minutes</strong>.
                <br>
                If you didn't request this password reset, please ignore this message.
            </p>

            <p style="font-size: 14px; color: #666; margin-top: 25px;">
                Thank you,<br>
                <strong>The Rentahanan Team</strong>
            </p>
        </div>

        <!-- FOOTER -->
        <div style="
            background-color: #f8f9fb;
            text-align: center;
            padding: 15px;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #e0e0e0;
        ">
            © 2025 Rentahanan | All Rights Reserved
        </div>
    </div>
</div>
"""

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email}],
        sender={"name": "Rentahanan App", "email": "padillacarlosnino.pdm@gmail.com"},
        subject="Your Password Reset Verification Code",
        html_content=html_content
    )

    try:
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        api_instance.send_transac_email(send_smtp_email)
        print(f"[Brevo] Sent password reset email to {email} with code {code}")
        return True
    except ApiException as e:
        print(f"[Brevo Error] Failed to send password reset email to {email}: {e}")
        return False


def send_welcome_email(email, user_name):
    """
    Send welcome email after registration (no verification code needed).
    Returns True if successful, False otherwise.
    """
    html_content = f"""
<div style="
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    background-color: #f4f6f8;
    padding: 40px 0;
">
    <div style="
        max-width: 600px;
        margin: auto;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        border: 1px solid #e0e0e0;
    ">

        <!-- HEADER -->
        <div style="
            background-color: #0048b4;
            color: white;
            padding: 20px 30px;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            text-align: center;
        ">
            <h1 style="font-size: 22px; font-weight: 600; margin: 0;">
                Welcome to Rentahanan!
            </h1>
        </div>

        <!-- BODY -->
        <div style="padding: 30px 40px;">
            <p style="font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 20px;">
                Hello <strong>{user_name}</strong>,
                <br><br>
                Thank you for registering with Rentahanan! We're excited to have you on board.
            </p>

            <div style="background-color: #f8f9fb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <p style="font-size: 14px; color: #444; margin: 0;">
                    <strong>What you can do now:</strong>
                </p>
                <ul style="font-size: 14px; color: #444; margin: 10px 0; padding-left: 20px;">
                    <li>Browse available properties</li>
                    <li>Contact property owners</li>
                    <li>Save your favorite listings</li>
                    <li>Manage your rental applications</li>
                </ul>
            </div>

            <p style="font-size: 14px; color: #666; line-height: 1.6;">
                If you have any questions or need assistance, feel free to reply to this email.
                <br>
                We're here to help you find your perfect home!
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://rentahanan.vercel.app/" style="
                    display: inline-block;
                    background-color: #0048b4;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                ">
                    Start Exploring Rentahanan
                </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 25px;">
                Welcome aboard!<br>
                <strong>The Rentahanan Team</strong>
            </p>
        </div>

        <!-- FOOTER -->
        <div style="
            background-color: #f8f9fb;
            text-align: center;
            padding: 15px;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #e0e0e0;
        ">
            © 2025 Rentahanan | All Rights Reserved
        </div>
    </div>
</div>
"""

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email}],
        sender={"name": "Rentahanan App", "email": "padillacarlosnino.pdm@gmail.com"},
        subject=f"Welcome to Rentahanan, {user_name}!",
        html_content=html_content
    )

    try:
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
        api_instance.send_transac_email(send_smtp_email)
        print(f"[Brevo] Sent welcome email to {email}")
        return True
    except ApiException as e:
        print(f"[Brevo Error] Failed to send welcome email to {email}: {e}")
        return False


def verify_code(email, code):
    """
    Verify if the provided code matches the stored one and is not expired.
    Returns (True, "message") or (False, "error message")
    """
    MAX_AGE = 15 * 60  # 15 minutes in seconds
    entry = verification_codes.get(email)

    if not entry:
        return False, "No verification code found for this email."

    # Check expiration
    if time.time() - entry["timestamp"] > MAX_AGE:
        del verification_codes[email]
        return False, "Verification code expired. Please request a new one."

    # Check match
    if entry["code"] == code:
        del verification_codes[email]
        return True, "Code verified successfully."

    return False, "Invalid verification code."