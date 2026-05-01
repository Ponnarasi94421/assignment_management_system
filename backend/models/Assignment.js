const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  assignmentNumber: String,
  year: String,
  department: String,
  subjectName: String,
  dueDate: Date,
  staffName: String,
  fileUrl: String,
  link: {
    type: String
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  dueSoonNotified: {
    type: Boolean,
    default: false
  },
  overdueNotified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("Assignment", assignmentSchema);
