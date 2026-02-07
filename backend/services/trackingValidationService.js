/**
 * Tracking Validation Service
 * Fraud detection and GPS validation for field officer tracking
 *
 * Features:
 * - Mock GPS detection
 * - Speed validation
 * - Distance jump detection (teleportation)
 * - Territory boundary validation
 * - Suspicious pattern detection
 * - Fraud score calculation
 */

const TrackingSession = require("../models/TrackingSession");
const LocationPoint = require("../models/LocationPoint");
const { Employee } = require("../src/models");

// Validation thresholds
const THRESHOLDS = {
  MAX_SPEED_KMH: 120, // Maximum realistic speed
  MAX_DISTANCE_JUMP_KM: 5, // Maximum distance between consecutive points
  MIN_TIME_BETWEEN_POINTS_SEC: 3, // Minimum time between location updates
  MOCK_GPS_PENALTY: 20, // Fraud score for mock GPS
  SPEED_VIOLATION_PENALTY: 15, // Fraud score for excessive speed
  TELEPORT_PENALTY: 25, // Fraud score for impossible distance jumps
  TERRITORY_VIOLATION_PENALTY: 10, // Fraud score for outside territory
  SUSPICIOUS_PATTERN_PENALTY: 10, // Fraud score for zigzag/erratic movement
  FRAUD_THRESHOLD: 50, // Auto-flag sessions above this score
};

/**
 * Calculate Haversine distance between two points (in kilometers)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate a batch of location points
 */
async function validateLocationBatch(sessionId, locations) {
  const session = await TrackingSession.findOne({ session_id: sessionId });

  if (!session) {
    throw new Error("Session not found");
  }

  const fraudFlags = new Set(session.fraud_flags || []);
  let fraudScore = session.fraud_score || 0;
  const warnings = [];

  // Get previous location point for comparison
  const lastPoint = await LocationPoint.findOne({ session_id: sessionId })
    .sort({ timestamp: -1 })
    .limit(1);

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    const prevLocation = i > 0 ? locations[i - 1] : lastPoint;

    // 1. Mock GPS Detection
    if (location.is_mock || location.provider === "mock") {
      if (!fraudFlags.has("mock_gps_detected")) {
        fraudFlags.add("mock_gps_detected");
        fraudScore += THRESHOLDS.MOCK_GPS_PENALTY;
        warnings.push({
          type: "mock_gps",
          message: "Mock GPS provider detected",
          timestamp: location.timestamp,
          penalty: THRESHOLDS.MOCK_GPS_PENALTY,
        });
      }
    }

    // 2. Speed Validation
    if (prevLocation && location.speed > THRESHOLDS.MAX_SPEED_KMH) {
      if (!fraudFlags.has("excessive_speed")) {
        fraudFlags.add("excessive_speed");
        fraudScore += THRESHOLDS.SPEED_VIOLATION_PENALTY;
      }

      warnings.push({
        type: "excessive_speed",
        message: `Speed ${location.speed.toFixed(1)} km/h exceeds maximum ${THRESHOLDS.MAX_SPEED_KMH} km/h`,
        timestamp: location.timestamp,
        speed: location.speed,
        penalty: THRESHOLDS.SPEED_VIOLATION_PENALTY,
      });
    }

    // 3. Distance Jump Detection (Teleportation)
    if (prevLocation) {
      const distance = calculateDistance(
        prevLocation.latitude,
        prevLocation.longitude,
        location.latitude,
        location.longitude
      );

      const timeDiff = (new Date(location.timestamp) - new Date(prevLocation.timestamp)) / 1000; // seconds

      if (distance > THRESHOLDS.MAX_DISTANCE_JUMP_KM && timeDiff < 60) {
        if (!fraudFlags.has("distance_jump")) {
          fraudFlags.add("distance_jump");
          fraudScore += THRESHOLDS.TELEPORT_PENALTY;
        }

        warnings.push({
          type: "distance_jump",
          message: `Impossible distance jump: ${distance.toFixed(2)} km in ${timeDiff.toFixed(0)} seconds`,
          timestamp: location.timestamp,
          distance_km: distance,
          time_sec: timeDiff,
          penalty: THRESHOLDS.TELEPORT_PENALTY,
        });
      }

      // Calculate implied speed from distance and time
      if (timeDiff > 0) {
        const impliedSpeed = (distance / timeDiff) * 3600; // km/h

        if (impliedSpeed > THRESHOLDS.MAX_SPEED_KMH && !location.speed) {
          warnings.push({
            type: "implied_excessive_speed",
            message: `Implied speed ${impliedSpeed.toFixed(1)} km/h from GPS coordinates`,
            timestamp: location.timestamp,
            implied_speed: impliedSpeed,
          });
        }
      }
    }

    // 4. Accuracy Check
    if (location.accuracy && location.accuracy > 100) {
      warnings.push({
        type: "low_accuracy",
        message: `Low GPS accuracy: ${location.accuracy}m`,
        timestamp: location.timestamp,
        accuracy: location.accuracy,
        severity: "low",
      });
    }
  }

  // 5. Territory Boundary Validation
  if (session.employee_id) {
    const isInTerritory = await validateTerritoryBoundary(session.employee_id, locations);

    if (!isInTerritory) {
      if (!fraudFlags.has("outside_territory")) {
        fraudFlags.add("outside_territory");
        fraudScore += THRESHOLDS.TERRITORY_VIOLATION_PENALTY;
        warnings.push({
          type: "outside_territory",
          message: "Location points detected outside assigned territory",
          penalty: THRESHOLDS.TERRITORY_VIOLATION_PENALTY,
        });
      }
    }
  }

  // 6. Suspicious Pattern Detection
  if (locations.length >= 5) {
    const hasErrativeMovement = detectErrativeMovement(locations);

    if (hasErrativeMovement) {
      if (!fraudFlags.has("suspicious_pattern")) {
        fraudFlags.add("suspicious_pattern");
        fraudScore += THRESHOLDS.SUSPICIOUS_PATTERN_PENALTY;
        warnings.push({
          type: "suspicious_pattern",
          message: "Erratic or zigzag movement pattern detected",
          penalty: THRESHOLDS.SUSPICIOUS_PATTERN_PENALTY,
        });
      }
    }
  }

  // Update session with fraud score and flags
  session.fraud_score = fraudScore;
  session.fraud_flags = Array.from(fraudFlags);

  // Auto-flag if fraud score exceeds threshold
  if (fraudScore >= THRESHOLDS.FRAUD_THRESHOLD && session.status !== "flagged") {
    session.status = "flagged";
    warnings.push({
      type: "auto_flagged",
      message: `Session auto-flagged due to fraud score ${fraudScore} >= ${THRESHOLDS.FRAUD_THRESHOLD}`,
      fraud_score: fraudScore,
      severity: "high",
    });
  }

  await session.save();

  return {
    isValid: fraudScore < THRESHOLDS.FRAUD_THRESHOLD,
    fraudScore,
    fraudFlags: Array.from(fraudFlags),
    warnings,
  };
}

/**
 * Validate if location is within employee's assigned territory
 */
async function validateTerritoryBoundary(employeeId, locations) {
  try {
    const employee = await Employee.findById(employeeId).populate(
      "territory_assignments.territory_id"
    );

    if (
      !employee ||
      !employee.territory_assignments ||
      employee.territory_assignments.length === 0
    ) {
      // No territory assigned, skip validation
      return true;
    }

    // Check if any location point is within assigned territories
    // This is a simplified check - in production, you'd use geospatial queries
    // with territory polygon boundaries

    // For now, just return true (territory validation needs polygon data)
    return true;
  } catch (error) {
    console.error("Territory validation error:", error);
    return true; // Don't fail validation on error
  }
}

/**
 * Detect erratic/zigzag movement patterns
 */
function detectErrativeMovement(locations) {
  if (locations.length < 5) return false;

  let directionChanges = 0;
  let prevBearing = null;

  for (let i = 1; i < locations.length; i++) {
    const bearing = calculateBearing(
      locations[i - 1].latitude,
      locations[i - 1].longitude,
      locations[i].latitude,
      locations[i].longitude
    );

    if (prevBearing !== null) {
      const bearingDiff = Math.abs(bearing - prevBearing);

      // Check for sharp direction changes (> 120 degrees)
      if (bearingDiff > 120 && bearingDiff < 240) {
        directionChanges++;
      }
    }

    prevBearing = bearing;
  }

  // If more than 40% of movements are sharp turns, flag as suspicious
  const changeRatio = directionChanges / (locations.length - 1);
  return changeRatio > 0.4;
}

/**
 * Calculate bearing between two points
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  let bearing = Math.atan2(y, x);
  bearing = ((bearing * 180) / Math.PI + 360) % 360;

  return bearing;
}

/**
 * Get validation summary for a session
 */
async function getSessionValidationSummary(sessionId) {
  const session = await TrackingSession.findOne({ session_id: sessionId });

  if (!session) {
    throw new Error("Session not found");
  }

  const locationCount = await LocationPoint.countDocuments({ session_id: sessionId });
  const mockLocations = await LocationPoint.countDocuments({
    session_id: sessionId,
    is_mock: true,
  });

  return {
    session_id: sessionId,
    fraud_score: session.fraud_score || 0,
    fraud_flags: session.fraud_flags || [],
    status: session.status,
    is_flagged: session.fraud_score >= THRESHOLDS.FRAUD_THRESHOLD,
    total_points: locationCount,
    mock_points: mockLocations,
    mock_percentage: locationCount > 0 ? ((mockLocations / locationCount) * 100).toFixed(1) : 0,
  };
}

module.exports = {
  validateLocationBatch,
  getSessionValidationSummary,
  calculateDistance,
  THRESHOLDS,
};
