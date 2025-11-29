/**
 * Offer Receive Routes (Inventory Role)
 * Handles receiving PROCURED products at depot level
 */

const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const OfferSend = require("../../models/OfferSend");
const OfferReceive = require("../../models/OfferReceive");
const Product = require("../../models/Product");
const Facility = require("../../models/Facility");
const Notification = require("../../models/Notification");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

// Validation middleware for receiving offer
const validateOfferReceive = [
  body("products").isArray({ min: 1 }).withMessage("At least one product is required"),
  body("products.*.product_id").isMongoId().withMessage("Valid product ID is required"),
  body("products.*.qty_pcs_received")
    .isFloat({ min: 0 })
    .withMessage("Received quantity must be 0 or greater"),
  body("products.*.qty_pcs_sent")
    .isFloat({ min: 0.01 })
    .withMessage("Sent quantity must be greater than 0"),
  body("products.*.variance").optional().isFloat().withMessage("Variance must be a number"),
  body("products.*.batch_no").optional().trim(),
  body("products.*.production_date")
    .optional()
    .isISO8601()
    .withMessage("Valid production date format required"),
  body("products.*.expiry_date")
    .optional()
    .isISO8601()
    .withMessage("Valid expiry date format required"),
  body("products.*.variance_reason")
    .optional()
    .isIn(["", "damage", "shortage", "excess", "other"])
    .withMessage("Invalid variance reason"),
  body("products.*.note").optional().trim(),
  body("receive_date").optional().isISO8601().withMessage("Valid receive date is required"),
  body("quality_check_status")
    .optional()
    .isIn(["pending", "passed", "failed", "not_required"])
    .withMessage("Invalid quality check status"),
  body("quality_notes").optional().trim(),
  body("variance_note").optional().trim(),
  body("general_note").optional().trim(),
];

/**
 * @route   GET /api/v1/offers/receive-items/pending
 * @desc    Get pending offer sends for user's depot (Inventory role)
 * @access  Private (Inventory role)
 */
router.get(
  "/pending",
  authenticate,
  requireApiPermission("offers:receive:read"),
  async (req, res) => {
    try {
      const { facility_id } = req.userContext;

      if (!facility_id) {
        return res.status(400).json({
          success: false,
          message: "Facility ID not found in user context",
        });
      }

      // Get pending offer sends for this depot
      const pendingSends = await OfferSend.getPendingForDepot(facility_id);

      res.json({
        success: true,
        data: {
          sends: pendingSends,
          total: pendingSends.length,
        },
      });
    } catch (error) {
      console.error("Error fetching pending offers:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching pending offers",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/v1/offers/receive-items/history
 * @desc    Get receive history for user's depot (Inventory role)
 * @access  Private (Inventory role)
 */
router.get(
  "/history",
  authenticate,
  requireApiPermission("offers:receive:read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search = "" } = req.query;
      const { facility_id } = req.userContext;

      if (!facility_id) {
        return res.status(400).json({
          success: false,
          message: "Facility ID not found in user context",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query = {
        depot_id: facility_id,
        is_deleted: false,
      };

      if (search) {
        query.$or = [
          { ref_no: { $regex: search, $options: "i" } },
          { offer_send_ref_no: { $regex: search, $options: "i" } },
        ];
      }

      // Get receive history with pagination
      const [receives, total] = await Promise.all([
        OfferReceive.find(query)
          .populate("depot_id", "name type")
          .populate("offer_send_id", "ref_no send_date")
          .populate("products.product_id", "sku")
          .populate("received_by", "username")
          .sort({ receive_date: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        OfferReceive.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          receives,
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching receive history:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching receive history",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/v1/offers/receive-items/:id
 * @desc    Get single offer send details for receiving
 * @access  Private (Inventory role)
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("offers:receive:read"),
  [param("id").isMongoId().withMessage("Valid offer send ID is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { facility_id } = req.userContext;

      // Get offer send and verify it includes this depot
      const offerSend = await OfferSend.findOne({
        _id: req.params.id,
        depot_ids: facility_id,
        is_deleted: false,
      })
        .populate("depot_ids", "name type address")
        .populate("products.product_id", "sku trade_price wt_pcs category_id brand_id")
        .populate("created_by", "username")
        .populate({
          path: "products.product_id",
          populate: [
            { path: "category_id", select: "name" },
            { path: "brand_id", select: "name" },
          ],
        });

      if (!offerSend) {
        return res.status(404).json({
          success: false,
          message: "Offer send not found or not for your depot",
        });
      }

      // Check if already received by this depot
      const alreadyReceived = await OfferReceive.isAlreadyReceived(offerSend._id, facility_id);

      res.json({
        success: true,
        data: {
          offerSend,
          alreadyReceived,
        },
      });
    } catch (error) {
      console.error("Error fetching offer send:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching offer send",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/v1/offers/receive-items/:id
 * @desc    Receive offer products and update depot stock (Inventory role)
 * @access  Private (Inventory role)
 */
router.post(
  "/:id",
  authenticate,
  requireApiPermission("offers:receive:create"),
  [param("id").isMongoId().withMessage("Valid offer send ID is required")],
  validateOfferReceive,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const {
        products,
        receive_date,
        quality_check_status,
        quality_notes,
        variance_note,
        general_note,
      } = req.body;

      const { user_id, facility_id } = req.userContext;

      if (!facility_id) {
        return res.status(400).json({
          success: false,
          message: "Facility ID not found in user context",
        });
      }

      // Get offer send
      const offerSend = await OfferSend.findOne({
        _id: req.params.id,
        depot_ids: facility_id,
        is_deleted: false,
        status: { $ne: "cancelled" },
      });

      if (!offerSend) {
        return res.status(404).json({
          success: false,
          message: "Offer send not found, cancelled, or not for your depot",
        });
      }

      // Check if already received
      const alreadyReceived = await OfferReceive.isAlreadyReceived(offerSend._id, facility_id);

      if (alreadyReceived) {
        return res.status(400).json({
          success: false,
          message: "This offer has already been received by your depot",
        });
      }

      // Validate expiry dates (only if both are provided)
      for (const product of products) {
        if (product.production_date && product.expiry_date) {
          if (new Date(product.expiry_date) <= new Date(product.production_date)) {
            return res.status(400).json({
              success: false,
              message: `Expiry date must be after production date for product ${product.product_id}`,
            });
          }
        }
      }

      // Create offer receive record
      const offerReceive = new OfferReceive({
        offer_send_id: offerSend._id,
        offer_send_ref_no: offerSend.ref_no,
        depot_id: facility_id,
        receive_date: receive_date || new Date(),
        products,
        quality_check_status: quality_check_status || "passed",
        quality_notes: quality_notes || "",
        variance_note: variance_note || "",
        general_note: general_note || "",
        received_by: user_id,
      });

      await offerReceive.save();

      // Update depot stock (UPSERT) and create depot_transactions_in
      await offerReceive.updateDepotStock();

      // Update offer send depot status
      await offerSend.updateDepotStatus(facility_id, "received", user_id, general_note);

      // Populate for response
      await offerReceive.populate([
        { path: "depot_id", select: "name type" },
        { path: "offer_send_id", select: "ref_no send_date" },
        { path: "products.product_id", select: "sku trade_price wt_pcs" },
        { path: "received_by", select: "username" },
      ]);

      // Create notification for Sales Admin
      try {
        await Notification.createForRole(
          "Sales Admin",
          "Offer Products Received",
          `Offer ${offerSend.ref_no} has been received at ${offerReceive.depot_id.name}`,
          "offer",
          {
            offer_send_id: offerSend._id,
            offer_receive_id: offerReceive._id,
          }
        );
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }

      res.status(201).json({
        success: true,
        message: "Offer products received successfully and depot stock updated",
        data: offerReceive,
      });
    } catch (error) {
      console.error("Error receiving offer:", error);
      res.status(500).json({
        success: false,
        message: "Error receiving offer",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/v1/offers/receive-items/details/:receiveId
 * @desc    Get single offer receive details
 * @access  Private (Inventory role)
 */
router.get(
  "/details/:receiveId",
  authenticate,
  requireApiPermission("offers:receive:read"),
  [param("receiveId").isMongoId().withMessage("Valid receive ID is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { facility_id } = req.userContext;

      const receive = await OfferReceive.findOne({
        _id: req.params.receiveId,
        depot_id: facility_id,
        is_deleted: false,
      })
        .populate("depot_id", "name type address")
        .populate("offer_send_id", "ref_no send_date")
        .populate("products.product_id", "sku trade_price wt_pcs category_id brand_id")
        .populate("received_by", "username")
        .populate("approved_by", "username")
        .populate({
          path: "products.product_id",
          populate: [
            { path: "category_id", select: "name" },
            { path: "brand_id", select: "name" },
          ],
        });

      if (!receive) {
        return res.status(404).json({
          success: false,
          message: "Offer receive not found or not for your depot",
        });
      }

      res.json({
        success: true,
        data: receive,
      });
    } catch (error) {
      console.error("Error fetching receive details:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching receive details",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
