const mongoose = require("mongoose");

const locationPointSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    location: {
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
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    accuracy: {
      type: Number,
      default: null,
      min: 0,
    },
    speed: {
      type: Number,
      default: null,
      min: 0,
    },
    altitude: {
      type: Number,
      default: null,
    },
    heading: {
      type: Number,
      default: null,
      min: 0,
      max: 360,
    },
    is_mock: {
      type: Boolean,
      default: false,
      index: true,
    },
    provider: {
      type: String,
      enum: ["gps", "network", "fused", "unknown"],
      default: "unknown",
    },
    battery_level: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    network_type: {
      type: String,
      enum: ["wifi", "cellular", "none", "unknown"],
      default: "unknown",
    },
  },
  {
    timestamps: false, // We use timestamp field instead
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Compound indexes for efficient queries
locationPointSchema.index({ session_id: 1, timestamp: 1 });

// 2dsphere index for geospatial queries
locationPointSchema.index({ location: "2dsphere" });

// Pre-save hook to auto-populate location.coordinates from latitude/longitude
locationPointSchema.pre("save", function (next) {
  if (this.latitude && this.longitude) {
    this.location = {
      type: "Point",
      coordinates: [this.longitude, this.latitude],
    };
  }
  next();
});

/**
 * Static method to get points for a session with optional downsampling
 */
locationPointSchema.statics.getSessionPoints = async function (sessionId, options = {}) {
  const { downsample = false, maxPoints = 500 } = options;

  const totalPoints = await this.countDocuments({ session_id: sessionId });

  // If not many points or downsampling not requested, return all
  if (!downsample || totalPoints <= maxPoints) {
    return this.find({ session_id: sessionId }).sort({ timestamp: 1 }).lean();
  }

  // Calculate downsample factor
  const factor = Math.ceil(totalPoints / maxPoints);

  // Use aggregation to downsample
  const points = await this.aggregate([
    { $match: { session_id: sessionId } },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: { $mod: [{ $toDouble: "$timestamp" }, factor] },
        point: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$point" } },
    { $sort: { timestamp: 1 } },
  ]);

  return points;
};

/**
 * Static method to find points near a location
 */
locationPointSchema.statics.findNearby = async function (longitude, latitude, maxDistanceKm = 1) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceKm * 1000, // Convert km to meters
      },
    },
  })
    .limit(100)
    .lean();
};

/**
 * Static method to calculate statistics for a session
 */
locationPointSchema.statics.calculateSessionStats = async function (sessionId) {
  const stats = await this.aggregate([
    { $match: { session_id: sessionId } },
    {
      $group: {
        _id: null,
        total_points: { $sum: 1 },
        avg_accuracy: { $avg: "$accuracy" },
        min_accuracy: { $min: "$accuracy" },
        max_accuracy: { $max: "$accuracy" },
        avg_speed: { $avg: "$speed" },
        max_speed: { $max: "$speed" },
        mock_points: { $sum: { $cond: ["$is_mock", 1, 0] } },
        first_timestamp: { $min: "$timestamp" },
        last_timestamp: { $max: "$timestamp" },
      },
    },
  ]);

  return stats[0] || null;
};

module.exports = mongoose.model("LocationPoint", locationPointSchema);
