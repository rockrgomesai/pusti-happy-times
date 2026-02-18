/**
 * Outlet Visit Routes
 * API endpoints for tracking SO visits (shop closed, no sales, visit only)
 */

const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const OutletVisit = require("../models/OutletVisit");
const Outlet = require("../models/Outlet");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

/**
 * POST /api/v1/outlet-visits
 * Record a new outlet visit (shop closed, no sales, visit only)
 * @access Private (SO only)
 */
router.post(
  "/",
  authenticate,
  [
    body("outlet_id").isMongoId().withMessage("Valid outlet ID required"),
    body("visit_type")
      .isIn(["shop_closed", "no_sales", "visit_only"])
      .withMessage("Valid visit type required"),
    body("shop_status")
      .optional()
      .isIn(["Open", "Closed", "Temporarily Closed"])
      .withMessage("Valid shop status required"),
    body("shop_closed_reason").optional().isString().trim(),
    body("no_sales_reason")
      .optional()
      .isIn([
        "previous_order_not_delivered",
        "payment_issues",
        "overstocked",
        "credit_limit_reached",
        "outlet_requested_delay",
        "price_concerns",
        "competitor_issues",
        "other",
      ])
      .withMessage("Valid no sales reason required"),
    body("no_sales_notes").optional().isString().trim(),
    body("gps_location.coordinates")
      .isArray({ min: 2, max: 2 })
      .withMessage("GPS coordinates required [longitude, latitude]"),
    body("so_notes").optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        outlet_id,
        visit_type,
        shop_status,
        shop_closed_reason,
        no_sales_reason,
        no_sales_notes,
        gps_location,
        gps_accuracy,
        so_notes,
      } = req.body;
      const so_id = req.user._id;

      // Verify outlet exists
      const outlet = await Outlet.findById(outlet_id).populate(
        "route_id",
        "_id route_id distributor_id"
      );
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      // Validation: no_sales requires reason
      if (visit_type === "no_sales" && !no_sales_reason) {
        return res.status(400).json({
          success: false,
          message: "No sales reason is required for no_sales visit type",
        });
      }

      // Validation: "other" reason requires notes
      if (no_sales_reason === "other" && !no_sales_notes) {
        return res.status(400).json({
          success: false,
          message: "Notes are required when no sales reason is 'other'",
        });
      }

      // Calculate distance from outlet
      const outletCoords = outlet.location?.coordinates || [outlet.longi, outlet.lati];
      const distance = calculateDistance(
        gps_location.coordinates[1],
        gps_location.coordinates[0],
        outletCoords[1],
        outletCoords[0]
      );

      // Generate visit ID
      const visit_id = await OutletVisit.generateVisitId();

      // Create visit record
      const visit = new OutletVisit({
        visit_id,
        outlet_id,
        route_id: outlet.route_id?._id,
        so_id,
        distributor_id: outlet.route_id?.distributor_id,
        visit_date: new Date(),
        check_in_time: new Date(),
        visit_type,
        shop_status: shop_status || (visit_type === "shop_closed" ? "Closed" : undefined),
        shop_closed_reason,
        no_sales_reason,
        no_sales_notes,
        gps_location: {
          type: "Point",
          coordinates: gps_location.coordinates,
        },
        gps_accuracy,
        distance_from_outlet: distance,
        so_notes,
        productive: false,
      });

      await visit.save();

      // Update outlet last_visit_date
      outlet.last_visit_date = new Date();
      await outlet.save();

      // Populate for response
      await visit.populate([
        { path: "outlet_id", select: "outlet_id outlet_name" },
        { path: "so_id", select: "username email employee_id" },
        { path: "route_id", select: "route_id route_name" },
      ]);

      res.status(201).json({
        success: true,
        message: "Visit recorded successfully",
        data: visit,
      });
    } catch (error) {
      console.error("Error recording outlet visit:", error);
      res.status(500).json({
        success: false,
        message: "Failed to record visit",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/outlet-visits
 * Get outlet visits with filters
 * @access Private
 */
router.get(
  "/",
  authenticate,
  [
    query("outlet_id").optional().isMongoId().withMessage("Valid outlet ID required"),
    query("so_id").optional().isMongoId().withMessage("Valid SO ID required"),
    query("visit_type").optional().isString(),
    query("date_from").optional().isISO8601().withMessage("Valid date required"),
    query("date_to").optional().isISO8601().withMessage("Valid date required"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1-100"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { outlet_id, so_id, visit_type, date_from, date_to, limit = 50 } = req.query;

      const filter = {};
      if (outlet_id) filter.outlet_id = outlet_id;
      if (so_id) filter.so_id = so_id;
      if (visit_type) filter.visit_type = visit_type;
      if (date_from || date_to) {
        filter.visit_date = {};
        if (date_from) filter.visit_date.$gte = new Date(date_from);
        if (date_to) filter.visit_date.$lte = new Date(date_to);
      }

      const visits = await OutletVisit.find(filter)
        .populate("outlet_id", "outlet_id outlet_name address")
        .populate("so_id", "username email employee_id")
        .populate("route_id", "route_id route_name")
        .sort({ visit_date: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: visits,
        count: visits.length,
      });
    } catch (error) {
      console.error("Error fetching outlet visits:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch visits",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/outlet-visits/:id
 * Get single visit details
 * @access Private
 */
router.get(
  "/:id",
  authenticate,
  param("id").isMongoId().withMessage("Valid visit ID required"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const visit = await OutletVisit.findById(req.params.id)
        .populate("outlet_id", "outlet_id outlet_name address")
        .populate("so_id", "username email employee_id")
        .populate("route_id", "route_id route_name")
        .populate("order_id")
        .populate("audit_id")
        .populate("claim_id")
        .lean();

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: "Visit not found",
        });
      }

      res.json({
        success: true,
        data: visit,
      });
    } catch (error) {
      console.error("Error fetching visit:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch visit",
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/v1/outlet-visits/:id/checkout
 * Mark visit as checked out
 * @access Private (SO only)
 */
router.put(
  "/:id/checkout",
  authenticate,
  [
    param("id").isMongoId().withMessage("Valid visit ID required"),
    body("check_out_time").optional().isISO8601().withMessage("Valid checkout time required"),
    body("so_notes").optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { check_out_time, so_notes } = req.body;

      const visit = await OutletVisit.findById(req.params.id);
      if (!visit) {
        return res.status(404).json({
          success: false,
          message: "Visit not found",
        });
      }

      // Update checkout time and notes
      visit.check_out_time = check_out_time ? new Date(check_out_time) : new Date();
      if (so_notes) visit.so_notes = so_notes;

      await visit.save();

      res.json({
        success: true,
        message: "Visit checked out successfully",
        data: visit,
      });
    } catch (error) {
      console.error("Error checking out visit:", error);
      res.status(500).json({
        success: false,
        message: "Failed to checkout visit",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/outlet-visits/today-summary
 * Get today's visit durations for outlets (for route map)
 * @access Private
 */
router.get(
  "/today-summary",
  authenticate,
  [query("outlet_ids").optional().isString().withMessage("Outlet IDs should be comma-separated string")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { outlet_ids } = req.query;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const filter = {
        visit_date: { $gte: today, $lt: tomorrow },
      };

      // Filter by outlet IDs if provided
      if (outlet_ids) {
        const outletIdArray = outlet_ids.split(",").map((id) => id.trim());
        filter.outlet_id = { $in: outletIdArray };
      }

      const visits = await OutletVisit.find(filter)
        .select("outlet_id visit_type duration_minutes check_in_time check_out_time")
        .lean();

      // Build map of outlet_id => visit data
      const visitsByOutlet = {};
      visits.forEach((visit) => {
        const outletId = visit.outlet_id.toString();
        if (!visitsByOutlet[outletId]) {
          visitsByOutlet[outletId] = {
            outlet_id: outletId,
            visit_type: visit.visit_type,
            duration_minutes: visit.duration_minutes || 0,
            check_in_time: visit.check_in_time,
            check_out_time: visit.check_out_time,
            is_checked_out: !!visit.check_out_time,
          };
        }
      });

      res.json({
        success: true,
        data: visitsByOutlet,
      });
    } catch (error) {
      console.error("Error fetching today's visit summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch visit summary",
        error: error.message,
      });
    }
  }
);

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
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

module.exports = router;
