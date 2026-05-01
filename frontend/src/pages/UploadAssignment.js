import React, { useState } from "react";
import "./UploadAssignment.css";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // ✅ added

const UploadAssignment = () => {
  const navigate = useNavigate(); // ✅ added

  const [assignmentNumber, setAssignmentNumber] = useState("");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ validation 

    if ((!file && !link) || (file && link)) {
      alert("Please provide ONLY one: file OR link");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user"));
    const formData = new FormData();
    formData.append("assignmentNumber", assignmentNumber);
    formData.append("year", year);
    formData.append("department", department);
    formData.append("subjectName", subjectName);
    formData.append("dueDate", dueDate);
    formData.append("staffName", user.name);
    if (file) {
      formData.append("file", file);
    }

    if (link) {
      formData.append("link", link);
    }

    try {
      await axios.post(
        "http://localhost:5000/api/assignments/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // alert("Assignment Uploaded Successfully ✅");

      // ✅ redirect to student dashboard with the year and department they just uploaded for
      navigate("/staff"); // Navigate back to the new staff dashboard!

    } catch (error) {
      console.log(error);
      alert("Upload Failed ❌");
    }
  };

  return (
    <div className="staff-bg">
      <div className="staff-card">
        <h2>Upload Assignment</h2>
        <p className="subtitle">Enter Assignment Details</p>

        <form onSubmit={handleSubmit}>

          {/* Assignment Number */}
          <div className="floating-group">
            <input
              type="text"
              placeholder=" "
              value={assignmentNumber}
              onChange={(e) => setAssignmentNumber(e.target.value)}
              required
            />
            <label>Assignment Number</label>
          </div>

          {/* Year */}
          <div className="floating-group">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
            >
              <option value="" disabled hidden></option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
            <label>Select Year</label>
          </div>

          {/* Department */}
          <div className="floating-group">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            >
              <option value="" disabled hidden></option>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
            </select>
            <label>Select Department</label>
          </div>

          {/* Subject Name */}
          <div className="floating-group">
            <input
              type="text"
              placeholder=" "
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              required
            />
            <label>Subject Name</label>
          </div>

          {/* Due Date */}
          <div className="floating-group">
            <input
              type="date"
              placeholder=" "
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
            <label>Due Date</label>
          </div>

          {/* File Upload */}
          <label className="file-upload">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              
            />
            {file ? file.name : "Upload Assignment File"}
          </label>
          <div className="floating-group">
          <input
            type="text"
            placeholder=" "
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
            <label>Assignment Link (Google Form / URL)</label>
          </div>

          <button type="submit" className="upload-btn">Upload Assignment</button>
          <button type="button" className="back-btn" onClick={() => navigate('/staff')}>Back to Dashboard</button>
        </form>
      </div>
    </div>
  );
};

export default UploadAssignment;
