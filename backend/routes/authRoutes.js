const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");


// ✅ Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, year, department, registerNumber } = req.body;

    console.log("Signup Data:", req.body); // 🔥 debug

    // 1. Email already exists check
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered ❌",
      });
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create New User
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      year: role === "student" ? year : undefined,
      department: role === "student" ? department : undefined,
      registerNumber: role === "student" ? registerNumber : undefined,
    });

    await newUser.save();

    res.status(201).json({
      message: "Signup Successful ✅",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        year: newUser.year,
        department: newUser.department,
        registerNumber: newUser.registerNumber,
        phone: newUser.phone,
        language: newUser.language,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error); // 🔥 debug

    res.status(500).json({
      message: "Server Error ❌",
      error: error.message,
    });
  }
});


// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found ❌",
      });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password ❌",
      });
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login Successful ✅",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        year: user.year,
        department: user.department,
        registerNumber: user.registerNumber,
        phone: user.phone,
        language: user.language,
      },
    });
  } catch (error) {
    console.error("Login Error:", error); // 🔥 debug

    res.status(500).json({
      message: "Server Error ❌",
      error: error.message,
    });
  }
});


// ✅ Update Profile Route
router.put("/update-profile/:id", async (req, res) => {
  try {
    const { name, email, department, registerNumber, phone, language } = req.body;
    
    // Check if the email is being updated to an existing email
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use by another account ❌" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        department,
        registerNumber,
        phone,
        language
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found ❌" });
    }

    res.status(200).json({
      message: "Profile Updated Successfully ✅",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        year: updatedUser.year,
        department: updatedUser.department,
        registerNumber: updatedUser.registerNumber,
        phone: updatedUser.phone,
        language: updatedUser.language
      }
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      message: "Server Error ❌",
      error: error.message
    });
  }
});


// ✅ Export Router
module.exports = router;