const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// Fetch notifications for a student
router.get("/student/:studentId", async (req, res) => {
  try {
    const notifications = await Notification.find({ studentId: req.params.studentId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

// Mark a single notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Error marking notification as read" });
  }
});

// Mark all notifications as read for a student
router.put("/student/:studentId/read-all", async (req, res) => {
  try {
    await Notification.updateMany(
      { studentId: req.params.studentId, isRead: false },
      { isRead: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Error marking all notifications as read" });
  }
});

module.exports = router;
