const mongoose = require("mongoose");

const trackingSessionSummarySchema = new mongoose.Schema(
  {
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
    total_sessions: {
      type: Number,
      default: 0,
      min: 0,
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
    total_points: {
      type: Number,
      default: 0,
      min: 0,
    },
    average_fraud_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    sessions_completed: {
      type: Number,
      default: 0,
      min: 0,
    },
    sessions_flagged: {
      type: Number,
      default: 0,
      min: 0,
    },
    first_session_start: {
      type: Date,
      default: null,
    },
    last_session_end: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Unique compound index to ensure one summary per employee per day
trackingSessionSummarySchema.index({ employee_id: 1, date: 1 }, { unique: true });

// Index for date range queries
trackingSessionSummarySchema.index({ date: -1 });

/**
 * Static method to generate or update summary for a date
 */
trackingSessionSummarySchema.statics.generateSummary = async function (employeeId, date) {
  const TrackingSession = mongoose.model("TrackingSession");

  const summary = await TrackingSession.calculateDailySummary(employeeId, date);

  if (!summary) {
    return null;
  }

  // Get user_id from employee
  const Employee = mongoose.model("Employee");
  const employee = await Employee.findById(employeeId).select("user_id").lean();

  if (!employee || !employee.user_id) {
    return null;
  }

  // Upsert summary
  const summaryData = {
    user_id: employee.user_id,
    employee_id: employeeId,
    date: new Date(date),
    total_sessions: summary.total_sessions || 0,
    total_distance_km: summary.total_distance_km || 0,
    total_duration_seconds: summary.total_duration_seconds || 0,
    average_fraud_score: summary.average_fraud_score || 0,
    sessions_completed: summary.sessions_completed || 0,
    sessions_flagged: summary.sessions_flagged || 0,
    first_session_start: summary.first_session_start || null,
    last_session_end: summary.last_session_end || null,
  };

  const result = await this.findOneAndUpdate(
    { employee_id: employeeId, date: new Date(date) },
    summaryData,
    { upsert: true, new: true }
  );

  return result;
};

/**
 * Static method to get summaries for date range
 */
trackingSessionSummarySchema.statics.getSummariesByDateRange = async function (
  startDate,
  endDate,
  employeeIds = []
) {
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  if (employeeIds.length > 0) {
    query.employee_id = { $in: employeeIds };
  }

  return this.find(query)
    .populate("employee_id", "name code designation_id")
    .populate("user_id", "username email")
    .sort({ date: -1 })
    .lean();
};

/**
 * Static method to get aggregated stats
 */
trackingSessionSummarySchema.statics.getAggregatedStats = async function (
  startDate,
  endDate,
  employeeIds = []
) {
  const matchQuery = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  if (employeeIds.length > 0) {
    matchQuery.employee_id = { $in: employeeIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$employee_id",
        total_sessions: { $sum: "$total_sessions" },
        total_distance_km: { $sum: "$total_distance_km" },
        total_duration_seconds: { $sum: "$total_duration_seconds" },
        total_points: { $sum: "$total_points" },
        avg_fraud_score: { $avg: "$average_fraud_score" },
        days_tracked: { $sum: 1 },
        sessions_flagged: { $sum: "$sessions_flagged" },
      },
    },
    {
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },
    {
      $project: {
        employee_id: "$_id",
        employee_name: "$employee.name",
        employee_code: "$employee.code",
        total_sessions: 1,
        total_distance_km: { $round: ["$total_distance_km", 2] },
        total_duration_hours: {
          $round: [{ $divide: ["$total_duration_seconds", 3600] }, 1],
        },
        avg_fraud_score: { $round: ["$avg_fraud_score", 1] },
        days_tracked: 1,
        sessions_flagged: 1,
      },
    },
    { $sort: { total_distance_km: -1 } },
  ]);

  return stats;
};

module.exports = mongoose.model("TrackingSessionSummary", trackingSessionSummarySchema);
