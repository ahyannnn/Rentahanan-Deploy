import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./../styles/Login.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false); // ✅ ADDED: Loading state

    // Error states
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const navigate = useNavigate();

    // Use environment variable or fallback to production URL
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

    // ✅ ADDED: Loading Screen Component - SAME STYLING AS LAYOUT
    const LoadingScreen = () => (
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
                    <p className="loading-subtitle">Signing you in...</p>
                </div>

               

                {/* Loading Progress */}
                <div className="loading-progress">
                    <div className="loading-progress-bar">
                        <div 
                            className="loading-progress-fill"
                            style={{ width: '70%' }}
                        ></div>
                    </div>
                    <p className="loading-progress-text">
                        Authenticating your account..
                    </p>
                </div>
            </div>
        </div>
    );

    const handleLogin = async (e) => {
        e.preventDefault();

        // Reset errors
        setEmailError("");
        setPasswordError("");

        let isValid = true;

        // Validation
        if (!email) {
            setEmailError("Email address is required.");
            isValid = false;
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setEmailError("Please enter a valid email address.");
                isValid = false;
            }
        }

        if (!password) {
            setPasswordError("Password is required.");
            isValid = false;
        }

        if (!isValid) return;

        setLoading(true); // ✅ START loading

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Check if it's an email or password error from the server
                if (data.message?.toLowerCase().includes("user not found") || 
                    data.message?.toLowerCase().includes("email")) {
                    setEmailError(data.message);
                } else if (data.message?.toLowerCase().includes("password") || 
                           data.message?.toLowerCase().includes("incorrect")) {
                    setPasswordError(data.message);
                } else {
                    setEmailError(data.message || "Login failed. Please check your credentials.");
                }
                setLoading(false); // ✅ STOP loading on error
                return;
            }

            if (!data.user) {
                setEmailError("Unexpected response. Please try again.");
                setLoading(false); // ✅ STOP loading on error
                return;
            }

            // ✅ Extract user data from backend
            const {
                role,
                application_status,
                userid,
                tenantid,
                firstname,
                middlename,
                lastname,
                email: userEmail,
                phone,
            } = data.user;

            const fullName = [firstname, middlename, lastname].filter(Boolean).join(" ");

            // ✅ Store everything in ONE object (so Layout.jsx can read it easily)
            const userData = {
                userid,
                tenantid,
                fullName,
                email: userEmail,
                phone,
                role,
                applicationStatus: application_status || "Registered",
            };
            localStorage.setItem("user", JSON.stringify(userData));
            
            // ✅ ALSO store tenantid separately for easy access
            if (tenantid) {
                localStorage.setItem("tenantid", tenantid);
            }

            // ✅ Add small delay for smooth loading transition
            setTimeout(() => {
                setLoading(false);
                
                // ✅ Navigate based on role and status
                if (role.toLowerCase() === "owner") {
                    navigate("/owner");
                } else if (role.toLowerCase() === "tenant") {
                    navigate(
                        application_status === "Registered" ? "/tenant/browse-units" : "/tenant"
                    );
                } else {
                    navigate("/landing");
                }
            }, 500);

        } catch (error) {
            console.error("Login error:", error);
            setEmailError("Network error. Please check your connection.");
            setLoading(false); // ✅ STOP loading on error
        }
    };

    // ✅ SHOW LOADING SCREEN WHEN LOADING
    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="auth-wrapper-Login">
            <div className="auth-page-Login">
                {/* LEFT SIDE */}
                <div className="auth-left-Login">
                    <div className="overlay-Login"></div>
                    <div className="auth-left-content-Login">
                        <h1>Welcome Back!</h1>
                        <p>
                            Log in to explore available <span>houses</span> and manage your
                            listings effortlessly.
                        </p>
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="auth-right-Login">
                    <div className="auth-card-Login">
                        <h2
                            style={{
                                fontSize: "2rem",
                                fontWeight: 700,
                                color: "#061A53",
                                marginBottom: "2rem",
                                textAlign: "center",
                            }}
                            title="Access your RenTahanan account"
                        >
                            Login
                        </h2>

                        <form onSubmit={handleLogin}>

                            {/* EMAIL */}
                            <div className="form-group-Login">
                                <label title="Your registered email address">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setEmailError(""); // Clear error when user types
                                    }}
                                    className={`input-field-Login ${emailError ? 'input-error-Login' : ''}`}
                                    title="Enter the email address you used to register"
                                />
                                {emailError && (
                                    <div className="error-message-Login">
                                        {emailError}
                                    </div>
                                )}
                            </div>

                            {/* PASSWORD */}
                            <div className="form-group-Login password-group-Login">
                                <label title="Your account password">Password</label>
                                <div className="password-wrapper-Login">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setPasswordError(""); // Clear error when user types
                                        }}
                                        className={`input-field-Login ${passwordError ? 'input-error-Login' : ''}`}
                                        title="Enter your account password"
                                    />
                                    <button
                                        type="button"
                                        className="show-password-btn-Login"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? "Hide password text" : "Show password text"}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                
                                {passwordError && (
                                    <div className="error-message-Login">
                                        {passwordError}
                                    </div>
                                )}

                                <div className="forgot-link-Login">
                                    <Link 
                                        to="/forgot-password" 
                                        title="Reset your password if you've forgotten it"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <button 
                                className="main-login-btn-Login" 
                                type="submit"
                                title="Sign in to your account"
                                disabled={loading} // ✅ DISABLE BUTTON WHEN LOADING
                            >
                                {loading ? "Signing In..." : "Login"}
                            </button>

                            <span 
                                className="or-text-Login"
                                title="Alternative options"
                            >
                                OR
                            </span>

                            <div className="bottom-text-Login">
                                Don't have an account?{" "}
                                <Link 
                                    to="/register" 
                                    title="Create a new RenTahanan account"
                                >
                                    Register
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;