const mongoose = require("mongoose");

const trackingSessionSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    start_time: {
      type: Date,
      required: true,
    },
    end_time: {
      type: Date,
      default: null,
    },
    start_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      address: {
        type: String,
        default: "",
      },
    },
    end_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      address: {
        type: String,
        default: "",
      },
    },
    total_distance_km: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_duration_seconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
      index: true,
    },
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },
    device_info: {
      model: {
        type: String,
        default: "",
      },
      os_version: {
        type: String,
        default: "",
      },
      app_version: {
        type: String,
        default: "",
      },
      battery_level: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
    },
    fraud_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    fraud_flags: [
      {
        type: {
          type: String,
          enum: [
            "mock_gps",
            "speed_violation",
            "teleportation",
            "territory_violation",
            "stationary_spoofing",
            "route_deviation",
          ],
        },
        severity: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
        },
        detected_at: {
          type: Date,
          default: Date.now,
        },
        description: {
          type: String,
          default: "",
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  }
);

// Compound indexes for efficient queries
trackingSessionSchema.index({ employee_id: 1, date: -1 });
trackingSessionSchema.index({ status: 1, date: -1 });
trackingSessionSchema.index({ user_id: 1, created_at: -1 });
trackingSessionSchema.index({ date: 1, status: 1 });

// 2dsphere indexes for geospatial queries
trackingSessionSchema.index({ start_location: "2dsphere" });
trackingSessionSchema.index({ end_location: "2dsphere" });

// Virtual for duration in readable format
trackingSessionSchema.virtual("duration_formatted").get(function () {
  const seconds = this.total_duration_seconds;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
});

// Virtual for fraud level
trackingSessionSchema.virtual("fraud_level").get(function () {
  if (this.fraud_score < 30) return "trusted";
  if (this.fraud_score < 60) return "suspicious";
  if (this.fraud_score < 80) return "high_risk";
  return "critical";
});

/**
 * Static method to find active sessions by territory
 */
trackingSessionSchema.statics.findActiveByTerritory = async function (
  zoneIds = [],
  regionIds = [],
  areaIds = []
) {
  const Employee = mongoose.model("Employee");

  // Find employees in the specified territories
  const query = { $or: [] };

  if (zoneIds.length > 0) {
    query.$or.push({ "territory_assignments.zone_ids": { $in: zoneIds } });
  }
  if (regionIds.length > 0) {
    query.$or.push({ "territory_assignments.region_ids": { $in: regionIds } });
  }
  if (areaIds.length > 0) {
    query.$or.push({ "territory_assignments.area_ids": { $in: areaIds } });
  }

  if (query.$or.length === 0) {
    return [];
  }

  const employees = await Employee.find(query).select("_id").lean();
  const employeeIds = employees.map((e) => e._id);

  return this.find({
    employee_id: { $in: employeeIds },
    status: "active",
  })
    .populate("user_id", "username email")
    .populate("employee_id", "name code designation_id")
    .sort({ start_time: -1 })
    .lean();
};

/**
 * Static method to find sessions by date range
 */
trackingSessionSchema.statics.findByDateRange = async function (startDate, endDate, filters = {}) {
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  // Add optional filters
  if (filters.employee_ids && filters.employee_ids.length > 0) {
    query.employee_id = { $in: filters.employee_ids };
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.minFraudScore !== undefined) {
    query.fraud_score = { $gte: filters.minFraudScore };
  }

  if (filters.maxFraudScore !== undefined) {
    query.fraud_score = query.fraud_score || {};
    query.fraud_score.$lte = filters.maxFraudScore;
  }

  return this.find(query)
    .populate("user_id", "username email")
    .populate("employee_id", "name code designation_id")
    .sort({ start_time: -1 })
    .lean();
};

/**
 * Static method to calculate daily summary for a user
 */
trackingSessionSchema.statics.calculateDailySummary = async function (employeeId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const summary = await this.aggregate([
    {
      $match: {
        employee_id: new mongoose.Types.ObjectId(employeeId),
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
    },
    {
      $group: {
        _id: null,
        total_sessions: { $sum: 1 },
        total_distance_km: { $sum: "$total_distance_km" },
        total_duration_seconds: { $sum: "$total_duration_seconds" },
        average_fraud_score: { $avg: "$fraud_score" },
        sessions_completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        sessions_flagged: {
          $sum: { $cond: [{ $gt: ["$fraud_score", 60] }, 1, 0] },
        },
        first_session_start: { $min: "$start_time" },
        last_session_end: { $max: "$end_time" },
      },
    },
  ]);

  return summary[0] || null;
};

/**
 * Instance method to calculate distance using Haversine formula
 */
trackingSessionSchema.methods.calculateTotalDistance = async function () {
  const LocationPoint = mongoose.model("LocationPoint");

  const points = await LocationPoint.find({ session_id: this.session_id })
    .sort({ timestamp: 1 })
    .lean();

  if (points.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const distance = haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );

    totalDistance += distance;
  }

  return totalDistance;
};

/**
 * Haversine formula to calculate distance between two coordinates
 * Returns distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = mongoose.model("TrackingSession", trackingSessionSchema);
