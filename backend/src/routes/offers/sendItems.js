/**
 * Offer Send Routes (Sales Admin)
 * Handles sending PROCURED products from Sales Admin to multiple depots
 */

const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const OfferSend = require("../../models/OfferSend");
const Product = require("../../models/Product");
const Facility = require("../../models/Facility");
const Notification = require("../../models/Notification");
const { authenticate, requireApiPermission } = require("../../middleware/auth");

// Validation middleware for creating offer send
const validateOfferSend = [
  body("depot_ids").isArray({ min: 1 }).withMessage("At least one depot is required"),
  body("depot_ids.*").isMongoId().withMessage("Valid depot ID is required"),
  body("send_date").optional().isISO8601().withMessage("Valid send date is required"),
  body("products").isArray({ min: 1 }).withMessage("At least one product is required"),
  body("products.*.product_id").isMongoId().withMessage("Valid product ID is required"),
  body("products.*.qty_pcs").isFloat({ min: 0.01 }).withMessage("Quantity must be greater than 0"),
  body("products.*.price").isFloat({ min: 0.01 }).withMessage("Price must be greater than 0"),
  body("products.*.batch_no").optional().trim(),
  body("products.*.production_date")
    .optional()
    .isISO8601()
    .withMessage("Valid production date format required"),
  body("products.*.expiry_date")
    .optional()
    .isISO8601()
    .withMessage("Valid expiry date format required"),
  body("products.*.note").optional().trim(),
  body("general_note").optional().trim(),
];

/**
 * @route   GET /api/v1/offers/send-items
 * @desc    Get list of offer sends with pagination and filters (Sales Admin)
 * @access  Private (Sales Admin role)
 */
router.get("/", authenticate, requireApiPermission("offers:send:read"), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status, depot_id } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { is_deleted: false };

    if (status) {
      query.status = status;
    }

    if (depot_id) {
      query.depot_ids = depot_id;
    }

    if (search) {
      query.$or = [
        { ref_no: { $regex: search, $options: "i" } },
        { "products.batch_no": { $regex: search, $options: "i" } },
      ];
    }

    // Get offer sends with pagination
    const [sends, total] = await Promise.all([
      OfferSend.find(query)
        .populate("depot_ids", "name type address")
        .populate("products.product_id", "sku trade_price wt_pcs")
        .populate("created_by", "username")
        .populate("depot_status.depot_id", "name")
        .populate("depot_status.received_by", "username")
        .sort({ send_date: -1, created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfferSend.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        sends,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching offer sends:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching offer sends",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/v1/offers/send-items/:id
 * @desc    Get single offer send by ID
 * @access  Private (Sales Admin role)
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("offers:send:read"),
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

      const send = await OfferSend.findOne({
        _id: req.params.id,
        is_deleted: false,
      })
        .populate("depot_ids", "name type address")
        .populate("products.product_id", "sku trade_price wt_pcs category_id brand_id")
        .populate("created_by", "username")
        .populate("depot_status.depot_id", "name")
        .populate("depot_status.received_by", "username")
        .populate({
          path: "products.product_id",
          populate: [
            { path: "category_id", select: "name" },
            { path: "brand_id", select: "name" },
          ],
        });

      if (!send) {
        return res.status(404).json({
          success: false,
          message: "Offer send not found",
        });
      }

      res.json({
        success: true,
        data: send,
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
 * @route   POST /api/v1/offers/send-items
 * @desc    Create new offer send (Sales Admin)
 * @access  Private (Sales Admin role)
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("offers:send:create"),
  validateOfferSend,
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

      const { depot_ids, send_date, products, general_note } = req.body;
      const { user_id } = req.userContext;

      // Verify all depot IDs exist and are Depot type
      const depots = await Facility.find({
        _id: { $in: depot_ids },
        type: "Depot",
      });

      if (depots.length !== depot_ids.length) {
        return res.status(400).json({
          success: false,
          message: "One or more invalid depot IDs. All must be Depot type facilities",
        });
      }

      // Verify all product IDs exist and are PROCURED type
      const productIds = products.map((p) => p.product_id);
      const productDocs = await Product.find({
        _id: { $in: productIds },
        product_type: "PROCURED",
        active: true,
      });

      if (productDocs.length !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more invalid product IDs. All must be active PROCURED type products",
        });
      }

      // Validate expiry dates are after production dates (if both provided)
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

      // Create offer send
      const offerSend = new OfferSend({
        depot_ids,
        send_date: send_date || new Date(),
        products,
        general_note,
        created_by: user_id,
      });

      await offerSend.save();

      // Populate for response
      await offerSend.populate([
        { path: "depot_ids", select: "name type address" },
        { path: "products.product_id", select: "sku trade_price wt_pcs" },
        { path: "created_by", select: "username" },
      ]);

      // Create notifications for Inventory users at each depot
      try {
        for (const depotId of depot_ids) {
          await Notification.createForRole(
            "Inventory",
            "New Offer Products Received",
            `New offer products (${offerSend.ref_no}) have been sent to your depot. Please review and receive.`,
            "offer",
            {
              offer_send_id: offerSend._id,
              depot_id: depotId,
            }
          );
        }
      } catch (notifError) {
        console.error("Error creating notifications:", notifError);
        // Don't fail the request if notifications fail
      }

      res.status(201).json({
        success: true,
        message: "Offer send created successfully",
        data: offerSend,
      });
    } catch (error) {
      console.error("Error creating offer send:", error);
      res.status(500).json({
        success: false,
        message: "Error creating offer send",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/v1/offers/send-items/:id/cancel
 * @desc    Cancel an offer send
 * @access  Private (Sales Admin role)
 */
router.put(
  "/:id/cancel",
  authenticate,
  requireApiPermission("offers:send:update"),
  [
    param("id").isMongoId().withMessage("Valid offer send ID is required"),
    body("cancellation_reason").notEmpty().trim().withMessage("Cancellation reason is required"),
  ],
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

      const { user_id } = req.userContext;
      const { cancellation_reason } = req.body;

      const offerSend = await OfferSend.findOne({
        _id: req.params.id,
        is_deleted: false,
      });

      if (!offerSend) {
        return res.status(404).json({
          success: false,
          message: "Offer send not found",
        });
      }

      if (offerSend.status === "fully_received") {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel fully received offer send",
        });
      }

      offerSend.status = "cancelled";
      offerSend.cancelled_by = user_id;
      offerSend.cancelled_at = new Date();
      offerSend.cancellation_reason = cancellation_reason;

      await offerSend.save();

      res.json({
        success: true,
        message: "Offer send cancelled successfully",
        data: offerSend,
      });
    } catch (error) {
      console.error("Error cancelling offer send:", error);
      res.status(500).json({
        success: false,
        message: "Error cancelling offer send",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/offers/send-items/:id
 * @desc    Soft delete an offer send
 * @access  Private (Sales Admin role)
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("offers:send:delete"),
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

      const { user_id } = req.userContext;

      const offerSend = await OfferSend.findOne({
        _id: req.params.id,
        is_deleted: false,
      });

      if (!offerSend) {
        return res.status(404).json({
          success: false,
          message: "Offer send not found",
        });
      }

      if (offerSend.status !== "pending" && offerSend.status !== "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Only pending or cancelled offer sends can be deleted",
        });
      }

      offerSend.is_deleted = true;
      offerSend.deleted_by = user_id;
      offerSend.deleted_at = new Date();

      await offerSend.save();

      res.json({
        success: true,
        message: "Offer send deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting offer send:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting offer send",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
