import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./../styles/Login.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Error states
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const navigate = useNavigate();

    // Use environment variable or fallback to production URL
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

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
                return;
            }

            if (!data.user) {
                setEmailError("Unexpected response. Please try again.");
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

        } catch (error) {
            console.error("Login error:", error);
            setEmailError("Network error. Please check your connection.");
        }
    };

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
                        >
                            Login
                        </h2>

                        <form onSubmit={handleLogin}>

                            {/* EMAIL */}
                            <div className="form-group-Login">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setEmailError(""); // Clear error when user types
                                    }}
                                    className={`input-field-Login ${emailError ? 'input-error-Login' : ''}`}
                                />
                                {emailError && (
                                    <div className="error-message-Login">
                                        {emailError}
                                    </div>
                                )}
                            </div>

                            {/* PASSWORD */}
                            <div className="form-group-Login password-group-Login">
                                <label>Password</label>
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
                                    />
                                    <button
                                        type="button"
                                        className="show-password-btn-Login"
                                        onClick={() => setShowPassword(!showPassword)}
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
                                    <Link to="/forgot-password">Forgot Password?</Link>
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <button className="main-login-btn-Login" type="submit">
                                Login
                            </button>

                            <span className="or-text-Login">OR</span>

                            <div className="bottom-text-Login">
                                Don't have an account? <Link to="/register">Register</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;