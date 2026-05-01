import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Fixed Login Function
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password,
        }
      );

      console.log("Login Response:", res.data);

      // ✅ save user only (IMPORTANT)
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // ✅ save token
      localStorage.setItem("token", res.data.token);

      // ✅ role-based redirect
      if (res.data.user.role === "staff") {
        navigate("/staff");
      } else {
        navigate("/student");
      }

    } catch (err) {
      console.log("Login Error:", err);

      alert(
        err.response?.data?.message || "Login Failed ❌"
      );
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">

        {/* Left Side Form */}
        <div className="login-left">
          <h2>Login</h2>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Username / Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span 
                className="password-toggle-icon" 
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                    <line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </span>
            </div>

            <button type="submit" className="login-btn">
              Login
            </button>
          </form>

          <p className="signup-text">
            Don’t have an account?{" "}
            <Link to="/signup">Sign Up</Link>
          </p>
        </div>

        {/* Right Side */}
        <div className="login-right">
          <h2>WELCOME BACK!</h2>
        </div>
      </div>
    </div>
  );
}

export default Login;