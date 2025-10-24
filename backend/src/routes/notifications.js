/**
 * Notification Routes
 * Handles user notification CRUD operations
 */

const express = require("express");
const { query, param, validationResult } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const notificationService = require("../services/notificationService");

const router = express.Router();

/**
 * GET /notifications/unread
 * Get unread notifications for current user
 */
router.get(
  "/unread",
  authenticate,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { limit = 50 } = req.query;
      const notifications = await notificationService.getUnreadNotifications(
        req.user._id,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: notifications,
        count: notifications.length,
      });
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch unread notifications",
        error: error.message,
      });
    }
  }
);

/**
 * GET /notifications/unread-count
 * Get count of unread notifications for current user
 */
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: error.message,
    });
  }
});

/**
 * GET /notifications
 * Get all notifications for current user (paginated)
 */
router.get(
  "/",
  authenticate,
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { page = 1, limit = 20 } = req.query;
      const result = await notificationService.getAllNotifications(
        req.user._id,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
        error: error.message,
      });
    }
  }
);

/**
 * PATCH /notifications/:id/read
 * Mark a notification as read
 */
router.patch(
  "/:id/read",
  authenticate,
  [param("id").isMongoId().withMessage("Invalid notification ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const notification = await notificationService.markAsRead(req.params.id, req.user._id);

      res.json({
        success: true,
        data: notification,
        message: "Notification marked as read",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      const statusCode = error.message === "Notification not found" ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to mark notification as read",
      });
    }
  }
);

/**
 * PATCH /notifications/read-all
 * Mark all notifications as read for current user
 */
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);

    res.json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
});

module.exports = router;
