/**
 * Outlet Visit Routes
 * API endpoints for tracking SO visits to outlets (shop closed, no sales, damage claims)
 */

const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const DamageClaim = require("../models/DamageClaim");
const Outlet = require("../models/Outlet");
const Product = require("../models/Product");
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
 * GET /api/v1/damage-claims/products
 * Get products previously delivered to outlet (for damage claim)
 * @access Private (SO only)
 */
router.get(
  "/products",
  authenticate,
  query("outlet_id").isMongoId().withMessage("Valid outlet ID required"),
  query("distributor_id").optional().isMongoId().withMessage("Valid distributor ID required"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { outlet_id, distributor_id } = req.query;
      const userId = req.user._id;

      // Verify outlet exists
      const outlet = await Outlet.findById(outlet_id);
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      // Get distributor from outlet or query
      const distId = distributor_id || outlet.route_id?.distributor_id;

      // Find products delivered to this outlet
      // Query secondarydeliveries collection for products delivered to this outlet
      const SecondaryDelivery = mongoose.model("SecondaryDelivery");
      const deliveries = await SecondaryDelivery.find({
        outlet_id: outlet_id,
        status: "Delivered",
      })
        .populate(
          "items.product_id",
          "sku english_name bangla_name unit_per_case trade_price category_id brand_id image_url"
        )
        .sort({ delivery_date: -1 })
        .limit(50) // Last 50 deliveries
        .lean();

      // Extract unique products
      const productMap = new Map();
      deliveries.forEach((delivery) => {
        delivery.items?.forEach((item) => {
          if (item.product_id && !productMap.has(item.product_id._id.toString())) {
            productMap.set(item.product_id._id.toString(), {
              _id: item.product_id._id,
              sku: item.product_id.sku,
              english_name: item.product_id.english_name,
              bangla_name: item.product_id.bangla_name,
              unit_per_case: item.product_id.unit_per_case,
              trade_price: item.product_id.trade_price,
              category_id: item.product_id.category_id,
              brand_id: item.product_id.brand_id,
              image_url: item.product_id.image_url,
              last_delivered: delivery.delivery_date,
            });
          }
        });
      });

      const products = Array.from(productMap.values());

      // Group by category if needed
      const Category = mongoose.model("Category");
      const categories = await Category.find({ active: true })
        .select("name hierarchy_level parent_id")
        .lean();

      const groupedProducts = {};
      for (const product of products) {
        const category = categories.find(
          (c) => c._id.toString() === product.category_id?.toString()
        );
        const categoryName = category?.name || "Uncategorized";

        if (!groupedProducts[categoryName]) {
          groupedProducts[categoryName] = {
            category: categoryName,
            products: [],
          };
        }

        groupedProducts[categoryName].products.push(product);
      }

      res.json({
        success: true,
        data: Object.values(groupedProducts),
        total_products: products.length,
        outlet_name: outlet.outlet_name,
      });
    } catch (error) {
      console.error("Error fetching products for damage claim:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/damage-claims
 * Submit a new damage claim
 * @access Private (SO only)
 */
router.post(
  "/",
  authenticate,
  [
    body("outlet_id").isMongoId().withMessage("Valid outlet ID required"),
    body("distributor_id").isMongoId().withMessage("Valid distributor ID required"),
    body("items").isArray({ min: 1 }).withMessage("At least one item required"),
    body("items.*.product_id").isMongoId().withMessage("Valid product ID required"),
    body("items.*.qty_claimed_pcs").isInt({ min: 1 }).withMessage("Valid quantity required"),
    body("items.*.damage_reason")
      .isIn([
        "physical_damage",
        "expired",
        "defective",
        "near_expiry",
        "wrong_product",
        "packaging_damage",
        "quality_issue",
      ])
      .withMessage("Valid damage reason required"),
    body("items.*.notes").optional().isString().trim(),
    body("items.*.batch_number").optional().isString().trim(),
    body("gps_location.coordinates")
      .isArray({ min: 2, max: 2 })
      .withMessage("GPS coordinates required [longitude, latitude]"),
    body("so_notes").optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { outlet_id, distributor_id, items, gps_location, so_notes } = req.body;
      const so_id = req.user._id;

      // Verify outlet exists
      const outlet = await Outlet.findById(outlet_id).populate("route_id", "_id route_id");
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      // Verify all products exist and get trade prices for estimation
      const productIds = items.map((item) => item.product_id);
      const products = await Product.find({ _id: { $in: productIds } })
        .select("sku trade_price unit_per_case")
        .lean();

      if (products.length !== productIds.length) {
        return res.status(404).json({
          success: false,
          message: "One or more products not found",
        });
      }

      // Enrich items with estimated values
      const enrichedItems = items.map((item) => {
        const product = products.find((p) => p._id.toString() === item.product_id);
        const estimatedValue = product ? product.trade_price * item.qty_claimed_pcs : 0;

        return {
          ...item,
          estimated_value_bdt: estimatedValue,
        };
      });

      // Generate claim ID
      const claim_id = await DamageClaim.generateClaimId();

      // Create damage claim
      const damageClaim = new DamageClaim({
        claim_id,
        outlet_id,
        distributor_id,
        so_id,
        route_id: outlet.route_id?._id,
        claim_date: new Date(),
        items: enrichedItems,
        gps_location: {
          type: "Point",
          coordinates: gps_location.coordinates,
        },
        gps_accuracy: req.body.gps_accuracy,
        so_notes,
        status: "Pending",
        status_history: [
          {
            status: "Pending",
            changed_by: so_id,
            changed_at: new Date(),
            comments: "Claim submitted by SO",
          },
        ],
      });

      await damageClaim.save();

      // Populate for response
      await damageClaim.populate([
        { path: "outlet_id", select: "outlet_id outlet_name" },
        { path: "distributor_id", select: "name distributor_id" },
        { path: "so_id", select: "username email" },
        {
          path: "items.product_id",
          select: "sku english_name bangla_name unit_per_case trade_price",
        },
      ]);

      res.status(201).json({
        success: true,
        message: "Damage claim submitted successfully",
        data: damageClaim,
      });
    } catch (error) {
      console.error("Error creating damage claim:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit damage claim",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/damage-claims/history
 * Get claim history for an outlet
 * @access Private (SO only)
 */
router.get(
  "/history",
  authenticate,
  query("outlet_id").isMongoId().withMessage("Valid outlet ID required"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1-100"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { outlet_id, limit = 20 } = req.query;

      const claims = await DamageClaim.find({ outlet_id })
        .populate("items.product_id", "sku english_name bangla_name")
        .populate("so_id", "username email")
        .sort({ claim_date: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: claims,
        count: claims.length,
      });
    } catch (error) {
      console.error("Error fetching claim history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch claim history",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/damage-claims/:id
 * Get single damage claim details
 * @access Private
 */
router.get(
  "/:id",
  authenticate,
  param("id").isMongoId().withMessage("Valid claim ID required"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const claim = await DamageClaim.findById(req.params.id)
        .populate("outlet_id", "outlet_id outlet_name address")
        .populate("distributor_id", "name distributor_id")
        .populate("so_id", "username email employee_id")
        .populate("route_id", "route_id route_name")
        .populate("items.product_id", "sku english_name bangla_name unit_per_case trade_price")
        .populate("verified_by", "username email")
        .populate("approved_by", "username email")
        .populate("rejected_by", "username email")
        .populate("status_history.changed_by", "username email")
        .lean();

      if (!claim) {
        return res.status(404).json({
          success: false,
          message: "Damage claim not found",
        });
      }

      res.json({
        success: true,
        data: claim,
      });
    } catch (error) {
      console.error("Error fetching damage claim:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch damage claim",
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/v1/damage-claims/:id/status
 * Update claim status (for admin/manager)
 * @access Private (Admin/Manager only)
 */
router.put(
  "/:id/status",
  authenticate,
  [
    param("id").isMongoId().withMessage("Valid claim ID required"),
    body("status")
      .isIn(["Under Review", "Verified", "Approved", "Rejected", "Replaced", "Closed"])
      .withMessage("Valid status required"),
    body("comments").optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, comments } = req.body;
      const userId = req.user._id;

      const claim = await DamageClaim.findById(req.params.id);
      if (!claim) {
        return res.status(404).json({
          success: false,
          message: "Damage claim not found",
        });
      }

      // Update status using instance method
      claim.updateStatus(status, userId, comments);

      // Update specific fields based on status
      if (status === "Verified") {
        claim.verified_by = userId;
        claim.verified_at = new Date();
        claim.verification_notes = comments;
      } else if (status === "Approved") {
        claim.approved_by = userId;
        claim.approved_at = new Date();
        claim.approval_notes = comments;
      } else if (status === "Rejected") {
        claim.rejected_by = userId;
        claim.rejected_at = new Date();
        claim.rejection_reason = comments;
      }

      await claim.save();

      res.json({
        success: true,
        message: `Claim status updated to ${status}`,
        data: claim,
      });
    } catch (error) {
      console.error("Error updating claim status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update claim status",
        error: error.message,
      });
    }
  }
);

module.exports = router;
