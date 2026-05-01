import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        "http://127.0.0.1:5000/api/auth/signup",
        {
          name,
          email,
          password,
          role,
          year: role === "student" ? year : null,
          department: role === "student" ? department : null,
          registerNumber: role === "student" ? registerNumber : null,
        }
      );

      navigate("/");

    } catch (error) {
      console.log("Signup Error:", error);

      alert(
        error.response?.data?.message ||
        "Server Not Running ❌ Check Backend"
      );
    }
  };

  return (
    <div className="signup-bg">
      <div className="signup-card">

        {/* Left Side Form */}
        <div className="signup-left">
          <h2>Sign Up</h2>

          <form onSubmit={handleSignup}>
            
            <input
              type="text"
              placeholder="Enter Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* ✅ Role FIRST */}
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>

            {/* ✅ Show only for STUDENT */}
            {role === "student" && (
              <>
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)} 
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>

                <select 
                  value={department} 
                  onChange={(e) => setDepartment(e.target.value)} 
                  required
                >
                  <option value="">Select Department</option>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                </select>

                <input
                  type="text"
                  placeholder="Enter Register Number"
                  value={registerNumber}
                  onChange={(e) => setRegisterNumber(e.target.value)}
                  required
                />
              </>
            )}

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
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

            <button type="submit" className="signup-btn">
              Register
            </button>
          </form>

          <p className="login-text">
            Already have an account? <Link to="/">Login</Link>
          </p>
        </div>

        {/* Right Side Panel */}
        <div className="signup-right">
          <h2>CREATE ACCOUNT</h2>
        </div>
      </div>
    </div>
  );
}

export default Signup;