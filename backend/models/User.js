const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    year: {
      type: String
    },
    department: {
      type: String,
    },
    registerNumber: {
      type: String,
    },

    role: {
      type: String,
      enum: ["student", "staff"],
      required: true,
    },
    phone: {
      type: String,
    },
    language: {
      type: String,
      default: "English",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
