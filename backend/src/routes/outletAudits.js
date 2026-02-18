/**
 * Outlet Audit Routes
 * Handles inventory audits at outlets
 */

const express = require("express");
const router = express.Router();
const { body, query, validationResult } = require("express-validator");
const OutletAudit = require("../models/OutletAudit");
const Product = require("../models/Product");
const Outlet = require("../models/Outlet");
const OutletVisit = require("../models/OutletVisit");

// ====================
// GET /api/v1/outlet-audits/products
// Get products with previous audit quantities for an outlet
// ====================
router.get(
  "/products",
  [
    query("outlet_id")
      .notEmpty()
      .withMessage("Outlet ID is required")
      .isMongoId()
      .withMessage("Invalid outlet ID"),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { outlet_id } = req.query;

      // Verify outlet exists
      const outlet = await Outlet.findById(outlet_id).select("name");
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      // Get previous audit
      const previousAudit = await OutletAudit.getPreviousAudit(outlet_id);

      // Get all active products grouped by category
      const products = await Product.find({ active: true })
        .select("sku english_name bangla_name unit_per_case trade_price category hierarchy")
        .sort({ "hierarchy.category": 1, english_name: 1 })
        .lean();

      // Build previous quantities map
      const previousQtyMap = {};
      if (previousAudit && previousAudit.items) {
        previousAudit.items.forEach((item) => {
          if (item.product_id) {
            previousQtyMap[item.product_id._id.toString()] = item.audited_qty_pcs;
          }
        });
      }

      // Group products by category and attach previous quantities
      const categorizedProducts = {};
      products.forEach((product) => {
        const category = product.hierarchy?.category || "Uncategorized";
        if (!categorizedProducts[category]) {
          categorizedProducts[category] = [];
        }

        categorizedProducts[category].push({
          _id: product._id,
          sku: product.sku,
          english_name: product.english_name,
          bangla_name: product.bangla_name,
          unit_per_case: product.unit_per_case,
          trade_price: product.trade_price,
          previous_qty_pcs: previousQtyMap[product._id.toString()] || 0,
        });
      });

      // Convert to array format
      const categories = Object.keys(categorizedProducts).map((categoryName) => ({
        category: categoryName,
        products: categorizedProducts[categoryName],
      }));

      return res.status(200).json({
        success: true,
        data: {
          outlet: {
            _id: outlet._id,
            name: outlet.name,
          },
          previous_audit: previousAudit
            ? {
                audit_id: previousAudit.audit_id,
                audit_date: previousAudit.audit_date,
              }
            : null,
          categories,
        },
      });
    } catch (error) {
      console.error("Error fetching audit products:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch products for audit",
        error: error.message,
      });
    }
  }
);

// ====================
// POST /api/v1/outlet-audits
// Submit new audit
// ====================
router.post(
  "/",
  [
    body("outlet_id")
      .notEmpty()
      .withMessage("Outlet ID is required")
      .isMongoId()
      .withMessage("Invalid outlet ID"),
    body("so_id")
      .notEmpty()
      .withMessage("Sales Officer ID is required")
      .isMongoId()
      .withMessage("Invalid SO ID"),
    body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
    body("items.*.product_id")
      .notEmpty()
      .isMongoId()
      .withMessage("Each item must have a valid product ID"),
    body("items.*.audited_qty_pcs")
      .notEmpty()
      .isInt({ min: 0 })
      .withMessage("Audited quantity must be a non-negative integer"),
    body("gps_location.coordinates")
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage("GPS coordinates must be [longitude, latitude]"),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        outlet_id,
        so_id,
        distributor_id,
        route_id,
        items,
        so_notes,
        gps_location,
        gps_accuracy,
      } = req.body;

      // Generate audit_id
      const audit_id = await OutletAudit.generateAuditId();

      // Get previous audit to populate previous quantities
      const previousAudit = await OutletAudit.getPreviousAudit(outlet_id);
      const previousQtyMap = {};
      if (previousAudit && previousAudit.items) {
        previousAudit.items.forEach((item) => {
          if (item.product_id) {
            previousQtyMap[item.product_id._id.toString()] = item.audited_qty_pcs;
          }
        });
      }

      // Attach previous quantities and calculate variance
      const itemsWithVariance = items.map((item) => ({
        ...item,
        previous_qty_pcs: previousQtyMap[item.product_id] || 0,
        variance: item.audited_qty_pcs - (previousQtyMap[item.product_id] || 0),
      }));

      // Create audit
      const audit = new OutletAudit({
        audit_id,
        outlet_id,
        so_id,
        distributor_id,
        route_id,
        items: itemsWithVariance,
        so_notes,
        status: "Submitted",
        previous_audit_id: previousAudit ? previousAudit._id : null,
        gps_location,
        gps_accuracy,
      });

      await audit.save();

      // Create visit record for audit
      const visitId = await OutletVisit.generateVisitId();
      const visit = new OutletVisit({
        visit_id: visitId,
        outlet_id,
        so_id,
        distributor_id,
        route_id,
        visit_type: "audit",
        audit_id: audit._id,
        check_in_time: new Date(),
        gps_location,
        so_notes,
      });
      await visit.save();

      // Update outlet last_visit_date
      await Outlet.findByIdAndUpdate(outlet_id, {
        last_visit_date: new Date(),
      });

      // Populate and return
      const populatedAudit = await OutletAudit.findById(audit._id)
        .populate("outlet_id", "name code address")
        .populate("so_id", "name employee_id")
        .populate("items.product_id", "sku english_name unit_per_case")
        .lean();

      return res.status(201).json({
        success: true,
        message: "Audit submitted successfully",
        data: populatedAudit,
      });
    } catch (error) {
      console.error("Error creating audit:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit audit",
        error: error.message,
      });
    }
  }
);

// ====================
// GET /api/v1/outlet-audits/history
// Get audit history for an outlet
// ====================
router.get(
  "/history",
  [
    query("outlet_id")
      .notEmpty()
      .withMessage("Outlet ID is required")
      .isMongoId()
      .withMessage("Invalid outlet ID"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { outlet_id, limit = 20 } = req.query;

      const audits = await OutletAudit.find({ outlet_id })
        .sort({ audit_date: -1 })
        .limit(parseInt(limit))
        .select("audit_id audit_date total_items total_qty_pcs total_variance status so_id")
        .populate("so_id", "name employee_id")
        .lean();

      return res.status(200).json({
        success: true,
        data: audits,
      });
    } catch (error) {
      console.error("Error fetching audit history:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch audit history",
        error: error.message,
      });
    }
  }
);

// ====================
// GET /api/v1/outlet-audits/:id
// Get single audit details
// ====================
router.get("/:id", async (req, res) => {
  try {
    const audit = await OutletAudit.findById(req.params.id)
      .populate("outlet_id", "name code address")
      .populate("so_id", "name employee_id")
      .populate("distributor_id", "name code")
      .populate("route_id", "name code")
      .populate("items.product_id", "sku english_name bangla_name unit_per_case trade_price")
      .populate("verified_by", "name employee_id")
      .lean();

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: audit,
    });
  } catch (error) {
    console.error("Error fetching audit:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit details",
      error: error.message,
    });
  }
});

// ====================
// PUT /api/v1/outlet-audits/:id/verify
// Verify audit (admin only)
// ====================
router.put(
  "/:id/verify",
  [body("verified_by").notEmpty().isMongoId().withMessage("Verifier ID is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { verified_by, verification_notes } = req.body;

      const audit = await OutletAudit.findByIdAndUpdate(
        req.params.id,
        {
          status: "Verified",
          verified_by,
          verified_at: new Date(),
          verification_notes,
        },
        { new: true }
      )
        .populate("outlet_id", "name code")
        .populate("so_id", "name employee_id")
        .lean();

      if (!audit) {
        return res.status(404).json({
          success: false,
          message: "Audit not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Audit verified successfully",
        data: audit,
      });
    } catch (error) {
      console.error("Error verifying audit:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to verify audit",
        error: error.message,
      });
    }
  }
);

module.exports = router;
