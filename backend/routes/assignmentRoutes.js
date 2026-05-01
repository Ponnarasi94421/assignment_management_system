const express = require("express");
const router = express.Router();
const multer = require("multer");
const Assignment = require("../models/Assignment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendEmail } = require("../utils/email");

// ✅ Multer Storage Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });


// ✅ Upload Assignment (File OR Link)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("Upload route hit");
    console.log("REQ BODY:", req.body);
    console.log("REQ FILE:", req.file);

    const {
      assignmentNumber,
      year,
      department,
      subjectName,
      dueDate,
      staffName,
      link
    } = req.body;

    // ❗ File or Link check
    if ((!req.file && !link) || (req.file && link)) {
      return res.status(400).json({
        message: "Provide ONLY file OR link ❌",
      });
    }

    const newAssignment = new Assignment({
      assignmentNumber,
      year,
      department,
      subjectName,
      dueDate,
      staffName,
      fileUrl: req.file ? req.file.path : "",
      link: link || null,
    });

    await newAssignment.save();

    console.log("Saved Successfully");

    res.status(201).json({
      message: "Assignment Uploaded Successfully ✅",
      assignment: newAssignment,
    });

    // 🚀 ASYNC NOTIFICATION LOGIC
    try {
      // Find all students in that year and department
      const students = await User.find({
        role: "student",
        year,
        department,
      });

      if (students.length > 0) {
        const message = `New Assignment Uploaded: ${subjectName} by ${staffName}. Due Date: ${new Date(dueDate).toLocaleDateString()}`;

        // Create In-App Notifications
        const notifications = students.map((student) => ({
          studentId: student._id,
          message,
        }));
        await Notification.insertMany(notifications);

        // Send Email Notifications
        for (const student of students) {
          if (student.email) {
            await sendEmail(
              student.email,
              `New Assignment Alert: ${subjectName}`,
              `Hello ${student.name},\n\nA new assignment has been uploaded.\n\nSubject: ${subjectName}\nUploaded by: ${staffName}\nDue Date: ${new Date(dueDate).toLocaleDateString()}\n\nPlease check your student dashboard for more details.\n\nBest Regards,\nAssignment Portal`
            );
          }
        }
        console.log(`Sent notifications to ${students.length} students.`);
      }
    } catch (notifErr) {
      console.error("Error sending notifications:", notifErr);
    }

  } catch (error) {
    console.log("ERROR:", error);

    res.status(500).json({
      message: "Upload Failed ❌",
      error: error.message,
    });
  }
});


// ✅ Get ALL assignments (for testing)
router.get("/all", async (req, res) => {
  try {
    const assignments = await Assignment.find();
    res.json(assignments);
  } catch (error) {
    console.log("Fetch All Error:", error);
    res.status(500).json({ message: "Error fetching assignments" });
  }
});


// ✅ Get assignments for STUDENT (FILTER 🔥)
router.get("/student", async (req, res) => {
  try {
    const { year, department } = req.query;

    console.log("Filter Request:", year, department);

    const assignments = await Assignment.find({
      year,
      department,
    });

    res.json(assignments);
  } catch (error) {
    console.log("Fetch Filter Error:", error);
    res.status(500).json({ message: "Error fetching assignments" });
  }
});


// ✅ Get assignment status (For Staff)
router.get("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const User = require("../models/User");
    const Submission = require("../models/Submission");

    // Get all students in that year & department
    const students = await User.find({
      role: "student",
      year: assignment.year,
      department: assignment.department,
    });

    // Get all submissions for this assignment
    const submissions = await Submission.find({ assignmentId: id });
    const submittedStudentIds = submissions.map((sub) => sub.studentId.toString());

    // Map students with submission status
    const result = students.map((student) => ({
      _id: student._id,
      name: student.name,
      registerNumber: student.registerNumber || "N/A",
      submitted: submittedStudentIds.includes(student._id.toString()),
    }));

    res.json(result);
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ message: "Error fetching status" });
  }
});


// ✅ Export
module.exports = router;