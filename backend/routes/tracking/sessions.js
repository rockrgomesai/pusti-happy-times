const express = require("express");
const mongoose = require("mongoose");
const { body, param, query, validationResult } = require("express-validator");
const TrackingSession = require("../../models/TrackingSession");
const LocationPoint = require("../../models/LocationPoint");
const { authenticate, requireApiPermission } = require("../../src/middleware/auth");
const { validateLocationBatch } = require("../../services/trackingValidationService");

const router = express.Router();

/**
 * @route   POST /api/v1/tracking/sessions/start
 * @desc    Start a new tracking session
 * @access  Private - Field officers only
 */
router.post(
  "/start",
  authenticate,
  [
    body("device_model").notEmpty().withMessage("Device model is required"),
    body("os_version").notEmpty().withMessage("OS version is required"),
    body("app_version").optional(),
    body("start_location.latitude")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    body("start_location.longitude")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
  ],
  async (req, res) => {
    try {
      console.log("📍 Session start request body:", JSON.stringify(req.body, null, 2));

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        });
      }

      // Check if user has employee_id
      if (!req.userContext?.employee_id) {
        return res.status(403).json({
          success: false,
          message: "Only employees can start tracking sessions",
        });
      }

      const { device_model, os_version, app_version, battery_level, start_location } = req.body;

      // Check for existing active session
      const existingSession = await TrackingSession.findOne({
        employee_id: req.userContext.employee_id,
        status: "active",
      });

      if (existingSession) {
        return res.status(400).json({
          success: false,
          message: "Active tracking session already exists",
          data: {
            session_id: existingSession.session_id,
            start_time: existingSession.start_time,
          },
        });
      }

      // Create new session
      const session_id = new mongoose.Types.ObjectId().toString();
      const now = new Date();

      const sessionData = {
        session_id,
        user_id: req.user._id,
        employee_id: req.userContext.employee_id,
        date: new Date(now.toDateString()), // Date only (no time)
        start_time: now,
        device_info: {
          model: device_model,
          os_version: os_version,
          app_version: app_version || "1.0.0",
          battery_level: battery_level || null,
        },
        status: "active",
      };

      // Add start location if provided
      if (start_location?.latitude && start_location?.longitude) {
        sessionData.start_location = {
          type: "Point",
          coordinates: [start_location.longitude, start_location.latitude],
          address: start_location.address || "",
        };
      }

      const session = new TrackingSession(sessionData);
      await session.save();

      console.log(
        `📍 Tracking session started: ${session_id} for employee ${req.userContext.employee_id}`
      );

      res.status(201).json({
        success: true,
        message: "Tracking session started successfully",
        data: {
          session_id: session.session_id,
          start_time: session.start_time,
          status: session.status,
        },
      });
    } catch (error) {
      console.error("Error starting tracking session:", error);
      res.status(500).json({
        success: false,
        message: "Error starting tracking session",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/v1/tracking/sessions/:session_id/locations/batch
 * @desc    Upload batch of location points
 * @access  Private
 */
router.post(
  "/:session_id/locations/batch",
  authenticate,
  [
    param("session_id").notEmpty().withMessage("Session ID is required"),
    body("points")
      .isArray({ min: 1, max: 50 })
      .withMessage("Points must be an array of 1-50 items"),
    body("points.*.latitude").isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
    body("points.*.longitude").isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
    body("points.*.timestamp").isISO8601().withMessage("Invalid timestamp"),
  ],
  async (req, res) => {
    try {
      console.log("📍 Location batch request body:", JSON.stringify(req.body, null, 2));
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(
          "📍 Location batch validation errors:",
          JSON.stringify(errors.array(), null, 2)
        );
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        });
      }

      const { session_id } = req.params;
      const { points } = req.body;

      // Verify session exists and belongs to user
      const session = await TrackingSession.findOne({ session_id });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Tracking session not found",
        });
      }

      if (session.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access to session",
        });
      }

      if (session.status !== "active") {
        return res.status(400).json({
          success: false,
          message: "Session is not active",
          status: session.status,
        });
      }

      // Prepare location points for insertion
      const locationPoints = points.map((point) => ({
        session_id,
        latitude: point.latitude,
        longitude: point.longitude,
        location: {
          type: "Point",
          coordinates: [point.longitude, point.latitude],
        },
        timestamp: new Date(point.timestamp),
        accuracy: point.accuracy || null,
        speed: point.speed || null,
        altitude: point.altitude || null,
        heading: point.heading || null,
        is_mock: point.is_mock || false,
        provider: point.provider || "unknown",
        battery_level: point.battery_level || null,
        network_type: point.network_type || "unknown",
      }));

      // Bulk insert points
      const insertedPoints = await LocationPoint.insertMany(locationPoints, {
        ordered: false, // Continue on error
      });

      console.log(`📍 Uploaded ${insertedPoints.length} location points for session ${session_id}`);

      // TODO: Trigger async fraud detection (will implement in next step)

      res.json({
        success: true,
        message: "Location points uploaded successfully",
        data: {
          session_id,
          received: points.length,
          inserted: insertedPoints.length,
        },
      });
    } catch (error) {
      console.error("Error uploading location points:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading location points",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/v1/tracking/sessions/:session_id/stop
 * @desc    Stop tracking session
 * @access  Private
 */
router.put(
  "/:session_id/stop",
  authenticate,
  [param("session_id").notEmpty().withMessage("Session ID is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("📍 Stop session validation errors:", JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        });
      }

      const { session_id } = req.params;

      // Find session
      const session = await TrackingSession.findOne({ session_id });

      if (!session) {
        console.log("❌ Stop session - session not found:", session_id);
        return res.status(404).json({
          success: false,
          message: "Tracking session not found",
        });
      }

      if (session.user_id.toString() !== req.user._id.toString()) {
        console.log("❌ Stop session - unauthorized:", session_id, "user:", req.user._id);
        return res.status(403).json({
          success: false,
          message: "Unauthorized access to session",
        });
      }

      if (session.status === "completed") {
        console.log("❌ Stop session - already completed:", session_id);
        return res.status(400).json({
          success: false,
          message: "Session already completed",
        });
      }

      // Calculate totals
      const stats = await LocationPoint.calculateSessionStats(session_id);
      const totalDistance = await session.calculateTotalDistance();

      const endTime = new Date();
      const durationSeconds = Math.floor((endTime - session.start_time) / 1000);

      // Get last location point for end location
      const lastPoint = await LocationPoint.findOne({ session_id }).sort({ timestamp: -1 }).lean();

      // Update session
      session.status = "completed";
      session.end_time = endTime;
      session.total_distance_km = totalDistance;
      session.total_duration_seconds = durationSeconds;

      if (lastPoint) {
        session.end_location = {
          type: "Point",
          coordinates: [lastPoint.longitude, lastPoint.latitude],
          address: "", // TODO: Add reverse geocoding
        };
      }

      await session.save();

      console.log(
        `✅ Tracking session stopped: ${session_id} - Distance: ${totalDistance.toFixed(
          2
        )} km, Duration: ${Math.floor(durationSeconds / 60)} minutes`
      );

      // TODO: Trigger background summary generation

      res.json({
        success: true,
        message: "Tracking session stopped successfully",
        data: {
          session_id: session.session_id,
          start_time: session.start_time,
          end_time: session.end_time,
          total_distance_km: session.total_distance_km,
          total_duration_seconds: session.total_duration_seconds,
          total_points: stats?.total_points || 0,
          status: session.status,
        },
      });
    } catch (error) {
      console.error("Error stopping tracking session:", error);
      res.status(500).json({
        success: false,
        message: "Error stopping tracking session",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
