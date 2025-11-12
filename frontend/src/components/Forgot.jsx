import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import "./../styles/Forgot.css";

const Forgot = () => {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1=email, 2=code, 3=new password, 4=success
  const [code, setCode] = useState(Array(6).fill(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // inline error messages
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stepLoading, setStepLoading] = useState(false); // ✅ ADDED: Step loading state

  // ✅ ADD API BASE - Same as Login and Layout components
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  const codeRefs = useRef([]);

  // ✅ ADDED: Loading Screen Component - SAME STYLING AS OTHERS
  const LoadingScreen = ({ stepNumber }) => {
    const stepMessages = {
      1: "Sending verification code...",
      2: "Verifying your code...", 
      3: "Resetting your password...",
      4: "Completing password reset..."
    };

    const stepTitles = {
      1: "Email Verification",
      2: "Code Verification",
      3: "Password Reset",
      4: "Success"
    };

    return (
      <div className="loading-screen-overlay">
        <div className="loading-screen-content">
          {/* Logo */}
          <div className="loading-logo-container">
            <img
              src="/logo.png"
              alt="RenTahanan Logo"
              className="loading-logo"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/80x80/1e40af/FFFFFF?text=R";
              }}
            />
          </div>

          {/* Loading Text */}
          <div className="loading-text-container">
            <h2 className="loading-title">RenTahanan</h2>
            <p className="loading-subtitle">{stepMessages[stepNumber] || "Processing your request..."}</p>
          </div>

          {/* Loading Progress */}
          <div className="loading-progress">
            <div className="loading-progress-bar">
              <div 
                className="loading-progress-fill"
                style={{ width: `${(stepNumber / 4) * 100}%` }}
              ></div>
            </div>
            <p className="loading-progress-text">
              {stepTitles[stepNumber]} • {Math.round((stepNumber / 4) * 100)}% Complete
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Auto-focus first empty code input when step 2 starts
  useEffect(() => {
    if (step === 2) {
      const firstEmptyIndex = code.findIndex((digit) => digit === "");
      if (firstEmptyIndex !== -1 && codeRefs.current[firstEmptyIndex]) {
        codeRefs.current[firstEmptyIndex].focus();
      }
    }
  }, [step]);

  // --- Handle email submission ---
  const handleForgot = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) return setError("Please enter your email.");

    try {
      setLoading(true);
      setStepLoading(true); // ✅ START loading
      
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/forgot/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      
      setLoading(false);

      if (response.ok) {
        // Add delay for smooth transition
        setTimeout(() => {
          setStep(2);
          setError("");
          setStepLoading(false); // ✅ STOP loading
        }, 800);
      } else {
        setError(data.message || "Email not registered.");
        setStepLoading(false); // ✅ STOP loading on error
      }
    } catch (error) {
      setLoading(false);
      setStepLoading(false); // ✅ STOP loading on error
      setError("Error connecting to the server.");
    }
  };

  // --- Handle code input ---
  const handleCodeChange = (value, index) => {
    if (/^[0-9]?$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Auto focus next input
      if (value && index < 5) {
        codeRefs.current[index + 1].focus();
      }
      // Move back if deleted
      if (!value && index > 0) {
        codeRefs.current[index - 1].focus();
      }
    }
  };

  // --- Verify code ---
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    const enteredCode = code.join("");
    if (enteredCode.length !== 6)
      return setError("Please enter the complete 6-digit code.");

    try {
      setLoading(true);
      setStepLoading(true); // ✅ START loading
      
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/forgot/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: enteredCode }),
      });
      const data = await response.json();
      
      setLoading(false);

      if (response.ok) {
        // Add delay for smooth transition
        setTimeout(() => {
          setStep(3);
          setError("");
          setStepLoading(false); // ✅ STOP loading
        }, 800);
      } else {
        setError(data.message || "Invalid verification code.");
        setStepLoading(false); // ✅ STOP loading on error
      }
    } catch (error) {
      setLoading(false);
      setStepLoading(false); // ✅ STOP loading on error
      setError("Error connecting to the server.");
    }
  };

  // --- Reset password ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword)
      return setError("Please fill both password fields.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");

    try {
      setLoading(true);
      setStepLoading(true); // ✅ START loading
      
      // ✅ UPDATED API ENDPOINT
      const response = await fetch(`${API_BASE}/api/forgot/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });
      const data = await response.json();
      
      setLoading(false);

      if (response.ok) {
        // Add delay for smooth transition to success
        setTimeout(() => {
          // Go to success step
          setStep(4);
          setEmail("");
          setCode(Array(6).fill(""));
          setPassword("");
          setConfirmPassword("");
          setError("");
          setStepLoading(false); // ✅ STOP loading
        }, 1000);
      } else {
        setError(data.message || "Failed to reset password.");
        setStepLoading(false); // ✅ STOP loading on error
      }
    } catch (error) {
      setLoading(false);
      setStepLoading(false); // ✅ STOP loading on error
      setError("Error connecting to the server.");
    }
  };

  // ✅ SHOW LOADING SCREEN WHEN STEP IS CHANGING
  if (stepLoading) {
    return <LoadingScreen stepNumber={step} />;
  }

  return (
    <div className="forgot-container-Forgot">
      <div className="forgot-wrapper-Forgot">
        <div className="forgot-left-Forgot">
          <div className="forgot-text-Forgot">
            <h1 
              className="forgot-heading-Forgot"
              title="Reset your RenTahanan account password"
            >
              Forgot Password?
            </h1>
            <p 
              className="forgot-description-Forgot"
              title="Follow these steps to securely reset your password"
            >
              Don't worry — we've got you covered. Follow the steps to reset your
              password.
            </p>
          </div>
        </div>

        <div className="forgot-right-Forgot">
          <div className="forgot-card-Forgot">
            {/* Step 1: Enter email */}
            {step === 1 && (
              <>
                <h2 
                  className="forgot-title-Forgot"
                  title="Start password reset process"
                >
                  Reset Password
                </h2>
                <form onSubmit={handleForgot} className="forgot-form-Forgot">
                  <div className="forgot-form-group-Forgot">
                    <label 
                      className="forgot-label-Forgot"
                      title="Your registered email address"
                    >
                      Email Address
                    </label>
                    <input
                      className="forgot-input-Forgot"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      title="Enter the email address associated with your account"
                    />
                    {error && <p className="error-text-Forgot">{error}</p>}
                  </div>
                  <button 
                    type="submit" 
                    className="forgot-btn-Forgot" 
                    disabled={loading || stepLoading}
                    title="Send verification code to your email"
                  >
                    {loading ? "Sending..." : "Send Code"}
                  </button>
                  <div className="forgot-bottom-text-Forgot">
                    Remembered password?{" "}
                    <Link 
                      to="/login" 
                      className="forgot-link-Forgot"
                      title="Return to login page"
                    >
                      Back to Login
                    </Link>
                  </div>
                </form>
              </>
            )}

            {/* Step 2: Enter verification code */}
            {step === 2 && (
              <>
                <h2 
                  className="forgot-title-Forgot"
                  title="Enter the code sent to your email"
                >
                  Enter Verification Code
                </h2>
                <p 
                  className="forgot-instruction-Forgot"
                  title="6-digit security code for verification"
                >
                  Please enter the 6-digit code sent to your email.
                </p>
                <form onSubmit={handleVerify} className="forgot-form-Forgot">
                  <div className="code-input-group-Forgot">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength="1"
                        value={digit}
                        ref={(el) => (codeRefs.current[index] = el)}
                        onChange={(e) => handleCodeChange(e.target.value, index)}
                        className="code-input-Forgot"
                        title={`Verification code digit ${index + 1}`}
                        disabled={stepLoading} // ✅ DISABLE INPUTS DURING LOADING
                      />
                    ))}
                  </div>
                  {error && <p className="error-text-Forgot">{error}</p>}
                  <button 
                    type="submit" 
                    className="forgot-btn-Forgot" 
                    disabled={loading || stepLoading}
                    title="Verify the code and proceed"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                  <div className="forgot-bottom-text-Forgot">
                    Didn't receive code?{" "}
                    <span 
                      onClick={() => !stepLoading && handleForgot()} 
                      className={`resend-link-Forgot ${stepLoading ? 'disabled-link-Forgot' : ''}`}
                      title={stepLoading ? "Please wait..." : "Resend verification code"}
                    >
                      Resend it
                    </span>
                  </div>
                </form>
              </>
            )}

            {/* Step 3: New password */}
            {step === 3 && (
              <>
                <h2 
                  className="forgot-title-Forgot"
                  title="Create your new password"
                >
                  Set New Password
                </h2>
                <form onSubmit={handleResetPassword} className="forgot-form-Forgot">
                  {/* New Password */}
                  <div className="forgot-form-group-Forgot">
                    <label 
                      className="forgot-label-Forgot"
                      title="Enter your new secure password"
                    >
                      New Password
                    </label>
                    <div className="forgot-input-wrapper-Forgot">
                      <input
                        className="forgot-input-Forgot"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        title="Create a strong new password for your account"
                        disabled={stepLoading} // ✅ DISABLE INPUTS DURING LOADING
                      />
                      <button
                        type="button"
                        className="toggle-password-Forgot"
                        onClick={() => !stepLoading && setShowPassword(!showPassword)}
                        title={showPassword ? "Hide password text" : "Show password text"}
                        disabled={stepLoading}
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="forgot-form-group-Forgot">
                    <label 
                      className="forgot-label-Forgot"
                      title="Re-enter your new password to confirm"
                    >
                      Confirm Password
                    </label>
                    <div className="forgot-input-wrapper-Forgot">
                      <input
                        className="forgot-input-Forgot"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        title="Re-enter your new password exactly as above"
                        disabled={stepLoading} // ✅ DISABLE INPUTS DURING LOADING
                      />
                      <button
                        type="button"
                        className="toggle-password-Forgot"
                        onClick={() => !stepLoading && setShowConfirmPassword(!showConfirmPassword)}
                        title={showConfirmPassword ? "Hide password text" : "Show password text"}
                        disabled={stepLoading}
                      >
                        {showConfirmPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>

                  {error && <p className="error-text-Forgot">{error}</p>}

                  <button 
                    type="submit" 
                    className="forgot-btn-Forgot" 
                    disabled={loading || stepLoading}
                    title="Save your new password"
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              </>
            )}

            {/* Step 4: Success message */}
            {step === 4 && (
              <div className="forgot-success-Forgot">
                <h2 
                  className="forgot-title-Forgot"
                  title="Password reset completed successfully"
                >
                  Password Changed Successfully
                </h2>
                <p 
                  className="forgot-success-message-Forgot"
                  title="You can now log in with your new password"
                >
                  Your password has been updated. You can now log in using your new password.
                </p>
                <button
                  className="forgot-btn-Forgot"
                  onClick={() => (window.location.href = "/login")}
                  title="Go back to login page"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forgot;