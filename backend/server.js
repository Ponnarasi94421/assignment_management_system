const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const Assignment = require("./models/Assignment");
const submissionRoutes = require("./routes/submissionRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

/* ================== MIDDLEWARE ================== */
app.use(express.json());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

/* ================== ROUTES ================== */
app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/notifications", notificationRoutes);


/* ================== STATIC FILE ================== */
app.use("/uploads", express.static("uploads"));



/* ================== TEST ROUTE ================== */
app.get("/", (req, res) => {
  res.send("Assignment Reminder Backend Running 🚀");
});

/* ================== MONGODB ================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log(err));

/* ================== SERVER ================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/* ================== AUTO DELETE & SCHEDULER ================== */
const startScheduler = require("./scheduler");

// Start Cron Jobs (Email & Reports)
startScheduler();

// 🔥 Auto Delete Logic (Runs every 24 hours)
setInterval(async () => {
  console.log("⏰ Cleanup running...");
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const result = await Assignment.deleteMany({
      dueDate: { $lt: twoDaysAgo }
    });

    if (result.deletedCount > 0) {
      console.log("🧹 Auto Deleted Assignments:", result.deletedCount);
    }
  } catch (err) {
    console.log("❌ Cleanup Error:", err);
  }
}, 24 * 60 * 60 * 1000);