import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./../styles/Register.css";

const Register = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [formData, setFormData] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    dob: "",
    email: "",
    phone: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    zipcode: "",
    password: "",
    confirm: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({});
  const navigate = useNavigate();

  // ✅ ADD API BASE
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  // ✅ CHECK EMAIL AVAILABILITY FUNCTION
  const checkEmailExists = async (email) => {
    if (!email || !validateEmail(email)) {
      return false; // Don't check if email is invalid
    }

    try {
      const res = await fetch(`${API_BASE}/api/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.exists;
      }
      return false; // If API fails, don't block user
    } catch (error) {
      console.error("Error checking email:", error);
      return false; // Don't block on network errors
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
    if (errors.general) {
      setErrors({ ...errors, general: "" });
    }

    // Auto-validate certain fields as user types
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    validateField(name, value);
  };

  // Real-time field validation
  const validateField = (fieldName, value) => {
    let fieldError = "";

    switch (fieldName) {
      case "firstname":
      case "middlename":
      case "lastname":
        if (!value.trim()) {
          fieldError = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required.`;
        }
        break;

      case "dob":
        if (!value) {
          fieldError = "Date of Birth is required.";
        } else {
          const birthDate = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 18) {
            fieldError = "You must be at least 18 years old.";
          }
        }
        break;

      case "email":
        if (!value.trim()) {
          fieldError = "Email address is required.";
        } else if (!validateEmail(value)) {
          fieldError = "Please enter a valid email address.";
        } else {
          // Check email existence in real-time
          checkEmailExists(value);
        }
        break;

      case "phone":
        if (!value.trim()) {
          fieldError = "Phone number is required.";
        } else if (!validatePhone(value)) {
          fieldError = "Please enter a valid Philippine mobile number (09XXXXXXXXX).";
        }
        break;

      case "street":
      case "barangay":
      case "city":
      case "province":
        if (!value.trim()) {
          fieldError = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required.`;
        }
        break;

      case "zipcode":
        if (!value.trim()) {
          fieldError = "Zip Code is required.";
        } else if (!validateZipCode(value)) {
          fieldError = "Please enter a valid 4-digit zip code.";
        }
        break;

      case "password":
        if (!value) {
          fieldError = "Password is required.";
        } else if (value.length < 8) {
          fieldError = "Password must be at least 8 characters.";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          fieldError = "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
        }
        break;

      case "confirm":
        if (!value) {
          fieldError = "Confirm password is required.";
        } else if (formData.password !== value) {
          fieldError = "Passwords do not match.";
        }
        break;

      default:
        break;
    }

    if (fieldError) {
      setErrors({ ...errors, [fieldName]: fieldError });
    } else {
      const newErrors = { ...errors };
      delete newErrors[fieldName];
      setErrors(newErrors);
    }
  };

  // --- VALIDATION FUNCTIONS ---
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateZipCode = (zipcode) => {
    const zipRegex = /^\d{4}$/;
    return zipRegex.test(zipcode);
  };

  const validateStep1 = () => {
    let newErrors = {};
    if (!formData.firstname.trim()) newErrors.firstname = "First name is required.";
    if (!formData.middlename.trim()) newErrors.middlename = "Middle name is required.";
    if (!formData.lastname.trim()) newErrors.lastname = "Last name is required.";
    
    if (!formData.dob) {
      newErrors.dob = "Date of Birth is required.";
    } else {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        newErrors.dob = "You must be at least 18 years old.";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = async () => {
    let newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    } else {
      // Check if email already exists
      setCheckingEmail(true);
      const emailExists = await checkEmailExists(formData.email);
      setCheckingEmail(false);
      
      if (emailExists) {
        newErrors.email = "This email is already registered. Please use a different email or login.";
      }
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "Please enter a valid Philippine mobile number (09XXXXXXXXX).";
    }
    
    if (!formData.street.trim()) newErrors.street = "Street address is required.";
    if (!formData.barangay.trim()) newErrors.barangay = "Barangay is required.";
    if (!formData.city.trim()) newErrors.city = "City/Municipality is required.";
    if (!formData.province.trim()) newErrors.province = "Province is required.";
    
    if (!formData.zipcode.trim()) {
      newErrors.zipcode = "Zip Code is required.";
    } else if (!validateZipCode(formData.zipcode)) {
      newErrors.zipcode = "Please enter a valid 4-digit zip code.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    let newErrors = {};
    
    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
    }
    
    if (!formData.confirm) {
      newErrors.confirm = "Confirm password is required.";
    } else if (formData.password !== formData.confirm) {
      newErrors.confirm = "Passwords do not match.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- NAVIGATION HANDLERS ---
  const handleNext = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = validateStep1();
    } else if (step === 2) {
      setIsLoading(true);
      isValid = await validateStep2();
      setIsLoading(false);
    }

    if (isValid) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => setStep(step - 1);

  // Send welcome email after successful registration
  const sendWelcomeEmail = async (email, firstName) => {
    try {
      const res = await fetch(`${API_BASE}/api/welcome/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email,
          user_name: firstName 
        }),
      });
      
      if (res.ok) {
        console.log("Welcome email sent successfully");
        return true;
      } else {
        console.error("Failed to send welcome email");
        return false;
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep3()) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        // Registration successful - send welcome email
        await sendWelcomeEmail(formData.email, formData.firstname);
        
        // Directly show success message without verification
        setStep(4);
      } else {
        const errorData = await res.json();
        setErrors({ general: errorData.message || "Registration failed. Please try again." });
      }
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({ general: "Network error. Please check your connection and try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if current step has any errors
  const hasStepErrors = () => {
    if (step === 1) {
      return errors.firstname || errors.middlename || errors.lastname || errors.dob;
    } else if (step === 2) {
      return errors.email || errors.phone || errors.street || errors.barangay || 
             errors.city || errors.province || errors.zipcode;
    } else if (step === 3) {
      return errors.password || errors.confirm;
    }
    return false;
  };

  // --- RENDER ---
  return (
    <div className="auth-wrapper-Register">
      <div className="auth-page-Register">
        <div className="auth-left-Register">
          <div className="overlay-Register"></div>
          <div className="auth-left-content-Register">
            <h1>
              Join <span>RenTahanan</span>
            </h1>
            <p>
              Start your journey — whether you're a tenant or an owner, we've
              got you covered.
            </p>
          </div>
        </div>

        <div className="auth-right-Register">
          <div className="auth-card-Register">
            {step !== 4 && (
              <h2 className="auth-title-Register">
                {step === 1 && "Personal Information"}
                {step === 2 && "Contact & Address"}
                {step === 3 && "Create Password"}
              </h2>
            )}

            {step === 4 ? (
              <div className="success-step-Register">
                <h2>Account Created Successfully!</h2>
                <p>
                  Welcome to RenTahanan, <strong>{formData.firstname}</strong>!
                  <br />
                  Your account has been created successfully.
                  <br />
                  We've sent a welcome email to <strong>{formData.email}</strong>.
                  <br />
                  You can now login and start using RenTahanan.
                </p>
                <div style={{ marginTop: "25px" }}>
                  <button
                    className="btn-Register"
                    onClick={() => navigate("/login")}
                    title="Proceed to login page"
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form-Register">
                {/* General error message */}
                {errors.general && (
                  <div 
                    className="error-general-Register"
                    title="Registration error - please fix the issues below"
                  >
                    {errors.general}
                  </div>
                )}

                {step === 1 && (
                  <>
                    <div className="form-group-Register">
                      <label className="label-Register">First Name</label>
                      <input
                        className="input-Register"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter First Name"
                        title="Your legal first name as it appears on official documents"
                      />
                      {errors.firstname && <p className="error-text-Register">{errors.firstname}</p>}
                    </div>
                    <div className="form-group-Register">
                      <label className="label-Register">Middle Name</label>
                      <input
                        className="input-Register"
                        name="middlename"
                        value={formData.middlename}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter Middle Name"
                        title="Your middle name (optional but recommended for identification)"
                      />
                      {errors.middlename && <p className="error-text-Register">{errors.middlename}</p>} 
                    </div>
                    <div className="form-group-Register">
                      <label className="label-Register">Last Name</label>
                      <input
                        className="input-Register"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Dela Cruz"
                        title="Your family name or surname"
                      />
                      {errors.lastname && <p className="error-text-Register">{errors.lastname}</p>}
                    </div>
                    <div className="form-group-Register">
                      <label className="label-Register">Date of Birth</label>
                      <input
                        className="input-Register"
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        max={new Date().toISOString().split('T')[0]}
                        title="You must be at least 18 years old to register"
                      />
                      {errors.dob && <p className="error-text-Register">{errors.dob}</p>}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <div className="three-column-grid-Register">
                    {/* Email - Full Row */}
                    <div className="form-group-Register span-full-Register">
                      <label className="label-Register">Email</label>
                      <input
                        className="input-Register"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. juan.delacruz@gmail.com"
                        disabled={isLoading || checkingEmail}
                        title="Your active email address for account verification and communication"
                      />
                      <div className="error-email-Register">
                        {checkingEmail && <p className="loading-text-Register">Checking email availability...</p>}
                        {errors.email && !checkingEmail && <p className="error-text-Register">{errors.email}</p>}
                      </div>
                    </div>

                    {/* Phone and Zip Code side by side */}
                    <div className="form-group-Register">
                      <label className="label-Register">Phone</label>
                      <input
                        className="input-Register"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. 09171234567"
                        maxLength="11"
                        title="Philippine mobile number format: 09XXXXXXXXX (11 digits)"
                      />
                      {errors.phone && <p className="error-text-Register">{errors.phone}</p>}
                    </div>

                    <div className="form-group-Register">
                      <label className="label-Register">Zip Code</label>
                      <input
                        className="input-Register"
                        name="zipcode"
                        value={formData.zipcode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. 1200"
                        maxLength="4"
                        title="4-digit Philippine zip code for your area"
                      />
                      {errors.zipcode && <p className="error-text-Register">{errors.zipcode}</p>}
                    </div>

                    {/* Address fields */}
                    <div className="form-group-Register span-full-Register">
                      <label className="label-Register">Street Address</label>
                      <input
                        className="input-Register"
                        name="street"
                        value={formData.street}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Blk 1 Lot 2 Pinas St."
                        title="Your complete street address including house/unit number"
                      />
                      {errors.street && <p className="error-text-Register">{errors.street}</p>}
                    </div>
                    
                    <div className="form-group-Register">
                      <label className="label-Register">Barangay</label>
                      <input
                        className="input-Register"
                        name="barangay"
                        value={formData.barangay}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. San Jose"
                        title="The barangay or district where you reside"
                      />
                      {errors.barangay && <p className="error-text-Register">{errors.barangay}</p>}
                    </div>

                    <div className="form-group-Register">
                      <label className="label-Register">City</label>
                      <input
                        className="input-Register"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Makati"
                        title="City or municipality of your residence"
                      />
                      {errors.city && <p className="error-text-Register">{errors.city}</p>}
                    </div>

                    <div className="form-group-Register">
                      <label className="label-Register">Province</label>
                      <input
                        className="input-Register"
                        name="province"
                        value={formData.province}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Metro Manila"
                        title="Province or region where you live"
                      />
                      {errors.province && <p className="error-text-Register">{errors.province}</p>}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <>
                    <div className="form-group-Register password-group-Register">
                      <label className="label-Register">Password</label>
                      <div className="password-wrapper-Register">
                        <input
                          className="input-Register"
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Enter your password"
                          title="Minimum 8 characters with at least one uppercase letter, one lowercase letter, and one number"
                        />
                        <button
                          type="button"
                          className="show-btn-Register"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          title={showPassword ? "Hide password text" : "Show password text"}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                      {errors.password && <p className="error-text-Register">{errors.password}</p>}
                    </div>
                    <div className="form-group-Register password-group-Register">
                      <label className="label-Register">Confirm Password</label>
                      <div className="password-wrapper-Register">
                        <input
                          className="input-Register"
                          type={showConfirm ? "text" : "password"}
                          name="confirm"
                          value={formData.confirm}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Re-enter your password"
                          title="Re-enter your password exactly as above to confirm"
                        />
                        <button
                          type="button"
                          className="show-btn-Register"
                          onClick={() => setShowConfirm(!showConfirm)}
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                          title={showConfirm ? "Hide password text" : "Show password text"}
                        >
                          {showConfirm ? "Hide" : "Show"}
                        </button>
                      </div>
                      {errors.confirm && <p className="error-text-Register">{errors.confirm}</p>}
                    </div>
                  </>
                )}

                {step < 4 && (
                  <div className="form-buttons-Register">
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="btn-Register secondary-Register"
                        disabled={isLoading || checkingEmail}
                        title="Go back to previous step"
                      >
                        Back
                      </button>
                    )}
                    {step < 3 && (
                      <button 
                        type="button" 
                        onClick={handleNext} 
                        className="btn-Register"
                        disabled={isLoading || checkingEmail}
                        title="Continue to next step"
                      >
                        {isLoading ? "Checking..." : "Next"}
                      </button>
                    )}
                    {step === 3 && (
                      <button 
                        type="submit" 
                        className="btn-Register"
                        disabled={isLoading || hasStepErrors()}
                        title={hasStepErrors() ? "Please fix errors before submitting" : "Create your RenTahanan account"}
                      >
                        {isLoading ? "Creating Account..." : "Create Account"}
                      </button>
                    )}
                  </div>
                )}

                {step < 4 && (
                  <p className="bottom-text-Register">
                    Already have an account? <Link to="/login" title="Sign in to your existing account">Login</Link>
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;