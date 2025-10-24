/**
 * Notification Model
 * Stores persistent notifications for users (especially distributors)
 */

const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "offer", // New offer available
  "offer_ending", // Offer ending soon
  "order_status", // Order status update
  "payment", // Payment related
  "system", // System announcements
  "alert", // Important alerts
];

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Reference to related entity
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      default: null,
      index: true,
    },

    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    // Notification status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    read_at: {
      type: Date,
      default: null,
    },

    // Optional action data (for navigation, etc.)
    action_url: {
      type: String,
      trim: true,
    },

    action_label: {
      type: String,
      trim: true,
    },

    // Metadata for additional context
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Expiry (auto-delete old notifications)
    expires_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ user_id: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, type: 1, read: 1 });

// TTL index to auto-delete expired notifications
notificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0, sparse: true });

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
  this.read = true;
  this.read_at = new Date();
  return await this.save();
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ user_id: userId, read: false });
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  return await this.updateMany(
    { user_id: userId, read: false },
    { $set: { read: true, read_at: new Date() } }
  );
};

// Static method to bulk create notifications
notificationSchema.statics.bulkCreate = async function (notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return [];
  }

  // Use insertMany for efficiency
  return await this.insertMany(notifications, { ordered: false });
};

// Delete existing model if it exists
delete mongoose.connection.models["Notification"];

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
