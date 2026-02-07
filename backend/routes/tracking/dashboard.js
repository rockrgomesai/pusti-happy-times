/**
 * Tracking Dashboard API Routes
 * For admin/sales admin to monitor field officers
 */

const express = require("express");
const { query, validationResult } = require("express-validator");
const TrackingSession = require("../../models/TrackingSession");
const LocationPoint = require("../../models/LocationPoint");
const Employee = require("../../src/models/Employee");
const { authenticate, requireApiPermission } = require("../../src/middleware/auth");

const router = express.Router();

/**
 * @route   GET /api/v1/tracking/dashboard/sessions
 * @desc    Get tracking sessions with filters (for admin dashboard)
 * @access  Private - Admin/Sales Admin only
 */
router.get(
  "/sessions",
  authenticate,
  [
    query("status").optional().isIn(["active", "paused", "completed", "flagged"]),
    query("date_from").optional().isISO8601(),
    query("date_to").optional().isISO8601(),
    query("employee_id").optional().isString(),
    query("fraud_only").optional().isBoolean(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        status,
        date_from,
        date_to,
        employee_id,
        fraud_only,
        page = 1,
        limit = 50,
      } = req.query;

      // Build filter
      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (date_from || date_to) {
        filter.date = {};
        if (date_from) {
          const fromDate = new Date(date_from);
          fromDate.setHours(0, 0, 0, 0);
          filter.date.$gte = fromDate;
        }
        if (date_to) {
          const toDate = new Date(date_to);
          toDate.setHours(23, 59, 59, 999);
          filter.date.$lte = toDate;
        }
      }

      if (employee_id) {
        // Check if it's a MongoDB ID or employee code
        if (employee_id.match(/^[0-9a-fA-F]{24}$/)) {
          // Valid MongoDB ObjectId
          filter.employee_id = employee_id;
        } else {
          // Employee code - look up the employee
          const employee = await Employee.findOne({ employee_id: employee_id });
          if (employee) {
            filter.employee_id = employee._id;
          } else {
            // No employee found with this code
            return res.status(404).json({
              success: false,
              message: `Employee with code ${employee_id} not found`,
            });
          }
        }
      }

      if (fraud_only === "true") {
        filter.fraud_score = { $gte: 50 };
      }

      // Fetch sessions with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const sessions = await TrackingSession.find(filter)
        .populate("employee_id", "name employee_type employee_id")
        .populate("user_id", "username full_name")
        .sort({ start_time: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get current location for active sessions
      const sessionsWithLocation = await Promise.all(
        sessions.map(async (session) => {
          if (session.status === "active") {
            const lastLocation = await LocationPoint.findOne({
              session_id: session.session_id,
            })
              .sort({ timestamp: -1 })
              .limit(1)
              .lean();

            if (lastLocation) {
              session.current_location = {
                latitude: lastLocation.latitude,
                longitude: lastLocation.longitude,
                timestamp: lastLocation.timestamp,
              };
            }
          }
          return session;
        })
      );

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await TrackingSession.aggregate([
        {
          $facet: {
            total_active: [{ $match: { status: "active" } }, { $count: "count" }],
            total_completed_today: [
              {
                $match: {
                  status: "completed",
                  date: { $gte: today },
                },
              },
              { $count: "count" },
            ],
            flagged_sessions: [{ $match: { fraud_score: { $gte: 50 } } }, { $count: "count" }],
            average_distance: [
              {
                $match: {
                  status: "completed",
                  date: { $gte: today },
                },
              },
              {
                $group: {
                  _id: null,
                  avg_distance: { $avg: "$total_distance_km" },
                },
              },
            ],
          },
        },
      ]);

      const statsResult = {
        total_active: stats[0].total_active[0]?.count || 0,
        total_completed_today: stats[0].total_completed_today[0]?.count || 0,
        flagged_sessions: stats[0].flagged_sessions[0]?.count || 0,
        average_distance: stats[0].average_distance[0]?.avg_distance || 0,
      };

      const total = await TrackingSession.countDocuments(filter);

      res.json({
        success: true,
        data: {
          sessions: sessionsWithLocation,
          stats: statsResult,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Dashboard sessions error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sessions",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/tracking/dashboard/sessions/:sessionId/details
 * @desc    Get detailed session info with all location points
 * @access  Private - Admin/Sales Admin only
 */
router.get("/sessions/:sessionId/details", authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await TrackingSession.findOne({ session_id: sessionId })
      .populate("employee_id", "name employee_type employee_id")
      .populate("user_id", "username full_name")
      .lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Get all location points (with downsampling for large datasets)
    const locationCount = await LocationPoint.countDocuments({
      session_id: sessionId,
    });

    let locations;
    if (locationCount > 1000) {
      // Downsample to max 1000 points
      locations = await LocationPoint.getSessionPoints(sessionId, 1000);
    } else {
      locations = await LocationPoint.find({ session_id: sessionId }).sort({ timestamp: 1 }).lean();
    }

    res.json({
      success: true,
      data: {
        session,
        locations,
        location_count: locationCount,
        is_downsampled: locationCount > 1000,
      },
    });
  } catch (error) {
    console.error("Session details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session details",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/tracking/dashboard/stats
 * @desc    Get overall tracking statistics
 * @access  Private - Admin/Sales Admin only
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    const filter = {};
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to) filter.date.$lte = new Date(date_to);
    }

    const stats = await TrackingSession.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total_sessions: { $sum: 1 },
          total_distance_km: { $sum: "$total_distance_km" },
          total_duration_hours: {
            $sum: { $divide: ["$total_duration_seconds", 3600] },
          },
          avg_distance_km: { $avg: "$total_distance_km" },
          avg_duration_hours: {
            $avg: { $divide: ["$total_duration_seconds", 3600] },
          },
          flagged_count: {
            $sum: {
              $cond: [{ $gte: ["$fraud_score", 50] }, 1, 0],
            },
          },
          mock_gps_count: {
            $sum: {
              $cond: [{ $in: ["mock_gps_detected", "$fraud_flags"] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total_sessions: 0,
        total_distance_km: 0,
        total_duration_hours: 0,
        avg_distance_km: 0,
        avg_duration_hours: 0,
        flagged_count: 0,
        mock_gps_count: 0,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
});

module.exports = router;
