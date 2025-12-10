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
  "collection", // Collection/payment status update
  "system", // System announcements
  "alert", // Important alerts
  // Inventory notifications
  "shipment_pending", // Goods sent to your store (awaiting receipt)
  "shipment_received", // Goods received confirmation
  "transfer_pending", // Transfer sent to your store
  "transfer_received", // Transfer received confirmation
  "low_stock_alert", // Product below threshold
  "expiry_alert", // Product expiring soon
  "stock_out", // Product out of stock
  "adjustment_approved", // Adjustment approved
  "adjustment_rejected", // Adjustment rejected
  "requisition_pending", // New requisition needs scheduling
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

    // Inventory references
    shipment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionSendToStore",
      default: null,
      index: true,
    },

    transfer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreTransfer",
      default: null,
      index: true,
    },

    inventory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FactoryStoreInventory",
      default: null,
      index: true,
    },

    collection_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      default: null,
      index: true,
    },

    requisition_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryRequisition",
      default: null,
      index: true,
    },

    // For targeting notifications by role + facility
    target_role: {
      type: String,
      index: true,
    },

    target_facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
    },

    // Priority level
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
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
notificationSchema.index({ target_role: 1, target_facility_id: 1, read: 1 });
notificationSchema.index({ priority: 1, read: 1, createdAt: -1 });

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

// Static method to create notification for role at facility
notificationSchema.statics.createForRoleAtFacility = async function (
  role,
  facilityId,
  notificationData
) {
  const User = mongoose.model("User");

  // Find all users with this role at this facility
  const users = await User.find({
    role_id: { $exists: true },
  })
    .populate({
      path: "role_id",
      match: { role: role },
    })
    .populate({
      path: "employee_id",
      match: { factory_store_id: facilityId },
    });

  const validUsers = users.filter(
    (u) =>
      u.role_id &&
      u.employee_id &&
      u.employee_id.factory_store_id?.toString() === facilityId.toString()
  );

  if (validUsers.length === 0) {
    console.log(`⚠️  No users found with role ${role} at facility ${facilityId}`);
    return [];
  }

  const notifications = validUsers.map((user) => ({
    user_id: user._id,
    target_role: role,
    target_facility_id: facilityId,
    ...notificationData,
  }));

  return await this.insertMany(notifications);
};

// Virtual for time ago
notificationSchema.virtual("time_ago").get(function () {
  const seconds = Math.floor((new Date() - this.createdAt) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Delete existing model if it exists
delete mongoose.connection.models["Notification"];

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
