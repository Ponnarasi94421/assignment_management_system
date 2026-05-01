const express = require("express");
const router = express.Router();
const multer = require("multer");

const Submission = require("../models/Submission");

// 📦 multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// 🚀 SUBMIT API
router.post("/submit", upload.single("file"), async (req, res) => {
  try {
    const { studentId, assignmentId } = req.body;

    // 🔍 Already submitted check
    const existing = await Submission.findOne({
      studentId,
      assignmentId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Already Submitted ❌",
      });
    }

    const newSubmission = new Submission({
      studentId,
      assignmentId,
      fileUrl: req.file ? req.file.path : null,
    });

    await newSubmission.save();

    res.status(201).json({
      message: "Submission Saved ✅",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Submission Failed ❌",
    });
  }
});


// ✅ GET submitted assignments for a student
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const submissions = await Submission.find({ studentId });

    res.json(submissions);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Fetch Failed ❌",
    });
  }
});


// ✅ Export
module.exports = router;