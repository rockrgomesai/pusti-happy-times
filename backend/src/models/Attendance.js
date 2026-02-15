const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    // User identification
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user_role: {
      type: String,
      enum: ["SO", "ASM", "RSM", "ZSM", "NSM", "DSR"],
      required: true,
    },

    // Date tracking
    attendance_date: {
      type: Date,
      required: true,
      index: true,
    },

    // Check-in details
    check_in_time: {
      type: Date,
      required: true,
      default: Date.now,
    },
    check_in_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    // Matched location (what triggered attendance)
    matched_location_type: {
      type: String,
      enum: ["outlet", "distributor"],
      required: true,
    },
    matched_location_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "matched_location_ref",
    },
    matched_location_ref: {
      type: String,
      enum: ["Outlet", "Distributor"],
      required: true,
    },
    matched_location_name: {
      type: String,
      required: true,
    },

    // Proximity data
    proximity_distance_meters: {
      type: Number,
      required: true,
    },
    proximity_threshold_used: {
      type: Number,
      default: 20,
    },

    // Route/Territory context
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
    },
    territory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Territory",
    },

    // Attendance status
    status: {
      type: String,
      enum: ["Present", "Late", "Half-Day", "Absent", "Leave"],
      default: "Present",
    },

    // Entry type
    entry_type: {
      type: String,
      enum: ["auto_mobile", "auto_web", "manual"],
      default: "auto_mobile",
      required: true,
    },

    // Device metadata
    device_info: {
      platform: String, // "android", "ios", "web"
      app_version: String,
      gps_accuracy: Number,
    },

    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
attendanceSchema.index({ check_in_location: "2dsphere" });

// Unique constraint: One attendance per user per day
attendanceSchema.index({ user_id: 1, attendance_date: 1 }, { unique: true });

// Compound indexes for queries
attendanceSchema.index({ status: 1, attendance_date: 1 });
attendanceSchema.index({ user_id: 1, status: 1 });

// Helper method to get start of day
attendanceSchema.statics.getStartOfDay = function (date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper method to check if user has marked attendance today
attendanceSchema.statics.hasMarkedToday = async function (userId) {
  const startOfDay = this.getStartOfDay(new Date());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const attendance = await this.findOne({
    user_id: userId,
    attendance_date: {
      $gte: startOfDay,
      $lt: endOfDay,
    },
  });

  return attendance;
};

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
