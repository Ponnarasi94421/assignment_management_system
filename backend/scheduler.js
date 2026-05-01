const cron = require("node-cron");
const Assignment = require("./models/Assignment");
const User = require("./models/User");
const Submission = require("./models/Submission");
const exceljs = require("exceljs");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const startScheduler = () => {
  console.log("⏰ Scheduler initialized.");

  // Check every minute for testing
  cron.schedule("*/1 * * * *", async () => {
    console.log("⏰ Scheduler checking for assignments and notifications...");
    try {
      const now = new Date();

      // Find assignments that haven't been fully processed
      const assignments = await Assignment.find({
        $or: [
          { emailSent: false, dueDate: { $lt: now } },
          { dueSoonNotified: false },
          { overdueNotified: false }
        ]
      });

      if (assignments.length === 0) {
        return;
      }

      for (let assignment of assignments) {
        const dueDate = new Date(assignment.dueDate);
        const hours = now.getHours();
        
        const oneDayBefore = new Date(dueDate);
        oneDayBefore.setDate(oneDayBefore.getDate() - 1);
        const isOneDayBefore = now.toDateString() === oneDayBefore.toDateString();
        const isDueDate = now.toDateString() === dueDate.toDateString();

        const students = await User.find({
          role: "student",
          year: assignment.year,
          department: assignment.department,
        });

        const submissions = await Submission.find({ assignmentId: assignment._id });
        const submittedIds = submissions.map((s) => s.studentId.toString());
        const unsubmittedStudents = students.filter(stu => !submittedIds.includes(stu._id.toString()));

        let notificationsToInsert = [];
        let updateFields = {};

        // 1. Due Tomorrow: 6 PM - 7 PM one day before
        if (isOneDayBefore && hours >= 18 && hours < 19 && !assignment.dueSoonNotified) {
          unsubmittedStudents.forEach(stu => {
            notificationsToInsert.push({
              studentId: stu._id,
              message: `Reminder: Assignment due tomorrow - ${assignment.subjectName}`,
              type: 'DUE_SOON'
            });
          });
          updateFields.dueSoonNotified = true;
          console.log(`Triggered Due Soon notifications for ${assignment.assignmentNumber}`);
        }

        // 2. Overdue/Due Today: 4 PM - 8 PM on due date
        if (isDueDate && hours >= 16 && hours < 20 && !assignment.overdueNotified) {
          unsubmittedStudents.forEach(stu => {
            notificationsToInsert.push({
              studentId: stu._id,
              message: `Alert: Assignment overdue today - ${assignment.subjectName}`,
              type: 'OVERDUE'
            });
          });
          updateFields.overdueNotified = true;
          console.log(`Triggered Overdue notifications for ${assignment.assignmentNumber}`);
        }

        if (notificationsToInsert.length > 0) {
          const Notification = require("./models/Notification");
          await Notification.insertMany(notificationsToInsert);
        }

        if (Object.keys(updateFields).length > 0) {
          await Assignment.updateOne({ _id: assignment._id }, { $set: updateFields });
        }

        // 3. Automated Report Email to Staff (only if dueDate has passed and email not sent)
        if (dueDate < now && !assignment.emailSent) {
          console.log(`Processing report for assignment: ${assignment.assignmentNumber}`);

          const staffIndex = await User.findOne({ name: assignment.staffName, role: "staff" });
          if (staffIndex && staffIndex.email) {
            const staffEmail = staffIndex.email;

            const workbook = new exceljs.Workbook();
            const worksheet = workbook.addWorksheet("Submission Status");

            worksheet.columns = [
              { header: "Register Number", key: "registerNumber", width: 25 },
              { header: "Student Name", key: "name", width: 30 },
              { header: "Status", key: "status", width: 20 },
            ];

            students.forEach((student) => {
              const submitted = submittedIds.includes(student._id.toString());
              worksheet.addRow({
                registerNumber: student.registerNumber || "N/A",
                name: student.name,
                status: submitted ? "Submitted" : "Not Submitted",
              });
            });

            const buffer = await workbook.xlsx.writeBuffer();

            const mailOptions = {
              from: process.env.EMAIL_USER,
              to: staffEmail,
              subject: `Automated Report: ${assignment.subjectName} - ${assignment.assignmentNumber}`,
              text: `Hello ${assignment.staffName},\n\nThe due date for ${assignment.subjectName} (${assignment.assignmentNumber}) has passed.\n\nPlease find attached the submission status report for ${assignment.year} - ${assignment.department}.\n\nSystem Auto-Mailer`,
              attachments: [
                {
                  filename: `Report_${assignment.assignmentNumber}.xlsx`,
                  content: buffer,
                },
              ],
            };

            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
              await transporter.sendMail(mailOptions);
              console.log(`📧 Email sent to ${staffEmail} for assignment ${assignment._id}`);
            } else {
              console.log(`📧 Simulation Mode: No email credentials found.`);
            }
          }
          await Assignment.updateOne({ _id: assignment._id }, { $set: { emailSent: true } });
        }
      }

      // --- NEW BLOCK: Auto-Delete assignments 2 days after due date ---
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const oldAssignments = await Assignment.find({ dueDate: { $lt: twoDaysAgo } });

      if (oldAssignments.length > 0) {
        const fs = require('fs');
        const path = require('path');
        
        for (let oldAssn of oldAssignments) {
          console.log(`🗑️ Auto-deleting assignment: ${oldAssn.assignmentNumber} (Overdue by > 2 days)`);
          
          // Delete Submissions associated with this assignment
          await Submission.deleteMany({ assignmentId: oldAssn._id });
          
          // Delete file if exists
          if (oldAssn.fileUrl) {
            try {
              const fileName = oldAssn.fileUrl.split('/').pop();
              // Try to locate in both possible upload dirs to be safe
              const filePathBackend = path.join(__dirname, 'uploads', fileName);
              if (fs.existsSync(filePathBackend)) {
                fs.unlinkSync(filePathBackend);
              }
            } catch (err) {
              console.error(`Failed to delete file for ${oldAssn.assignmentNumber}:`, err);
            }
          }

          // Finally, Delete the Assignment
          await Assignment.findByIdAndDelete(oldAssn._id);
        }
      }

    } catch (error) {
      console.error("Scheduler Error:", error);
    }
  });
};

module.exports = startScheduler;
