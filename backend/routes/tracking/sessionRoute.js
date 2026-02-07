const express = require("express");
const router = express.Router();
const TrackingSession = require("../../models/TrackingSession");
const LocationPoint = require("../../models/LocationPoint");
const { authenticate } = require("../../src/middleware/auth");

/**
 * @route   GET /api/v1/tracking/dashboard/sessions/:session_id/route
 * @desc    Get location points for a specific tracking session
 * @access  Private
 */
router.get("/:session_id/route", authenticate, async (req, res) => {
  try {
    const { session_id } = req.params;

    // Verify session exists
    const session = await TrackingSession.findOne({ session_id });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Fetch location points for this session
    const points = await LocationPoint.find({ session_id })
      .sort({ timestamp: 1 })
      .select("latitude longitude timestamp accuracy speed altitude heading is_mock")
      .lean();

    res.json({
      success: true,
      data: {
        session_id,
        employee_name: session.employee_id?.name || "Unknown",
        start_time: session.start_time,
        end_time: session.end_time,
        total_distance_km: session.total_distance_km,
        points: points.map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          timestamp: p.timestamp,
          accuracy: p.accuracy,
          speed: p.speed,
          altitude: p.altitude,
          heading: p.heading,
          is_mock: p.is_mock,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching session route:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching session route",
      error: error.message,
    });
  }
});

module.exports = router;
