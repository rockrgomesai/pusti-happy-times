const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Route = require("../models/Route");
const Outlet = require("../models/Outlet");
const Distributor = require("../models/Distributor");
const Role = require("../models/Role");
const { authenticate } = require("../middleware/auth");

// Configuration
const PROXIMITY_THRESHOLD_METERS = 20;

/**
 * Helper: Calculate Haversine distance between two points
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * POST /api/v1/attendance/check-in
 * Mark attendance based on proximity to outlet (SO) or distributor (ASM/RSM/ZSM)
 */
router.post("/check-in", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy } = req.body;

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates",
      });
    }

    // Get user with role
    const user = await User.findById(userId).populate("role_id");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const role = user.role_id?.role || user.role_id?.name;
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "User role not found",
      });
    }

    // Check if already marked today
    const existingAttendance = await Attendance.hasMarkedToday(userId);
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for today",
        data: {
          attendance_date: existingAttendance.attendance_date,
          check_in_time: existingAttendance.check_in_time,
          matched_location: existingAttendance.matched_location_name,
        },
      });
    }

    let matchedLocation = null;
    let matchedLocationType = null;
    let matchedLocationRef = null;
    let routeId = null;
    let territoryId = null;

    // Logic for SO - Check outlets in today's route
    if (role === "SO") {
      // Get today's day of week
      const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const today = daysOfWeek[new Date().getDay()];

      console.log(`SO Attendance Check - User: ${userId}, Today: ${today}`);

      // Convert userId to ObjectId for MongoDB query
      const userObjectId =
        userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId);

      // Find SO's route for today (check both sr_1 and sr_2 assignments)
      const route = await Route.findOne({
        $or: [
          {
            "sr_assignments.sr_1.sr_id": userObjectId,
            "sr_assignments.sr_1.visit_days": { $in: [today] },
          },
          {
            "sr_assignments.sr_2.sr_id": userObjectId,
            "sr_assignments.sr_2.visit_days": { $in: [today] },
          },
        ],
        active: true,
      });

      console.log(`Route found: ${route ? route.route_id : "NONE"}`);

      if (!route) {
        return res.status(400).json({
          success: false,
          message: `No route assigned for ${today}. Please contact your supervisor.`,
        });
      }

      routeId = route._id;

      // Get outlet IDs from route
      const outletIds = route.outlet_ids || [];

      console.log(`📍 Route has ${outletIds.length} outlets`);

      if (outletIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No outlets in your route for ${today}. Please contact your supervisor.`,
        });
      }

      console.log(`📍 User location: ${latitude}, ${longitude}`);
      console.log(`📍 Looking for outlets within ${PROXIMITY_THRESHOLD_METERS}m`);

      // Find nearest outlet using MongoDB geospatial query
      const nearbyOutlets = await Outlet.find({
        _id: { $in: outletIds },
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: PROXIMITY_THRESHOLD_METERS,
          },
        },
      }).limit(1);

      console.log(`📍 Found ${nearbyOutlets.length} nearby outlets`);

      if (nearbyOutlets.length > 0) {
        matchedLocation = nearbyOutlets[0];
        matchedLocationType = "outlet";
        matchedLocationRef = "Outlet";

        // Calculate exact distance for logging
        const outletCoords = matchedLocation.location.coordinates;
        matchedLocation.distance = calculateHaversineDistance(
          latitude,
          longitude,
          outletCoords[1],
          outletCoords[0]
        );

        console.log(
          `✅ Matched outlet: ${matchedLocation.outlet_name}, Distance: ${matchedLocation.distance.toFixed(2)}m`
        );
      }
    }
    // Logic for ASM/RSM/ZSM - Check distributors in territory
    else if (["ASM", "RSM", "ZSM", "NSM"].includes(role)) {
      // Determine territory field based on role
      let territoryField = null;
      let territoryValue = null;

      if (role === "ASM" && user.area_id) {
        territoryField = "area_id";
        territoryValue = user.area_id;
        territoryId = user.area_id;
      } else if (role === "RSM" && user.region_id) {
        territoryField = "region_id";
        territoryValue = user.region_id;
        territoryId = user.region_id;
      } else if (role === "ZSM" && user.zone_id) {
        territoryField = "zone_id";
        territoryValue = user.zone_id;
        territoryId = user.zone_id;
      } else if (role === "NSM") {
        // NSM can check in at any distributor (no territory restriction)
        territoryField = null;
      } else {
        return res.status(400).json({
          success: false,
          message: `${role} territory assignment not found. Please contact admin.`,
        });
      }

      // Build distributor query
      const distributorQuery = territoryField
        ? { [territoryField]: territoryValue, active: true }
        : { active: true };

      // Get all distributors in territory
      const distributors = await Distributor.find(distributorQuery).select("_id name location");

      if (distributors.length === 0) {
        return res.status(400).json({
          success: false,
          message: `No distributors found in your ${role} territory.`,
        });
      }

      // Get distributor IDs
      const distributorIds = distributors.map((d) => d._id);

      // Find nearest distributor using MongoDB geospatial query
      const nearbyDistributors = await Distributor.find({
        _id: { $in: distributorIds },
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: PROXIMITY_THRESHOLD_METERS,
          },
        },
      }).limit(1);

      if (nearbyDistributors.length > 0) {
        matchedLocation = nearbyDistributors[0];
        matchedLocationType = "distributor";
        matchedLocationRef = "Distributor";

        // Calculate exact distance
        const distCoords = matchedLocation.location.coordinates;
        matchedLocation.distance = calculateHaversineDistance(
          latitude,
          longitude,
          distCoords[1],
          distCoords[0]
        );
      }
    } else {
      return res.status(400).json({
        success: false,
        message: `Attendance check-in not supported for role: ${role}`,
      });
    }

    // Check if location matched
    if (!matchedLocation) {
      const locationTypeMsg = role === "SO" ? "an outlet in your route" : "a distributor";
      return res.status(400).json({
        success: false,
        message: `You must be within ${PROXIMITY_THRESHOLD_METERS} meters of ${locationTypeMsg} to mark attendance`,
      });
    }

    // Create attendance record
    const startOfDay = Attendance.getStartOfDay(new Date());
    const attendance = await Attendance.create({
      user_id: userId,
      user_role: role,
      attendance_date: startOfDay,
      check_in_time: new Date(),
      check_in_location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      matched_location_type: matchedLocationType,
      matched_location_id: matchedLocation._id,
      matched_location_ref: matchedLocationRef,
      matched_location_name: matchedLocation.outlet_name || matchedLocation.name,
      proximity_distance_meters: Math.round(matchedLocation.distance),
      proximity_threshold_used: PROXIMITY_THRESHOLD_METERS,
      route_id: routeId,
      territory_id: territoryId,
      status: "Present",
      entry_type: "auto_mobile",
      device_info: {
        platform: req.headers["user-agent"]?.includes("Android")
          ? "android"
          : req.headers["user-agent"]?.includes("iOS")
            ? "ios"
            : "unknown",
        gps_accuracy: accuracy || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Attendance marked successfully!",
      data: {
        attendance_date: attendance.attendance_date,
        check_in_time: attendance.check_in_time,
        matched_location: attendance.matched_location_name,
        distance_meters: attendance.proximity_distance_meters,
      },
    });
  } catch (error) {
    console.error("Error marking attendance:", error);

    // Handle duplicate attendance (race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for today",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/attendance/status
 * Check if user has marked attendance today
 */
router.get("/status", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const attendance = await Attendance.hasMarkedToday(userId);

    if (!attendance) {
      return res.json({
        success: true,
        marked: false,
        message: "Attendance not marked today",
      });
    }

    return res.json({
      success: true,
      marked: true,
      data: {
        attendance_date: attendance.attendance_date,
        check_in_time: attendance.check_in_time,
        matched_location: attendance.matched_location_name,
        matched_location_type: attendance.matched_location_type,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error("Error checking attendance status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check attendance status",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/attendance/history
 * Get user's attendance history
 */
router.get("/history", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit = 30 } = req.query;

    const query = { user_id: userId };

    // Date range filter
    if (startDate || endDate) {
      query.attendance_date = {};
      if (startDate) query.attendance_date.$gte = new Date(startDate);
      if (endDate) query.attendance_date.$lte = new Date(endDate);
    }

    const attendances = await Attendance.find(query)
      .sort({ attendance_date: -1 })
      .limit(parseInt(limit))
      .select(
        "attendance_date check_in_time matched_location_name matched_location_type proximity_distance_meters status"
      )
      .lean();

    return res.json({
      success: true,
      count: attendances.length,
      data: attendances,
    });
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance history",
      error: error.message,
    });
  }
});

module.exports = router;
