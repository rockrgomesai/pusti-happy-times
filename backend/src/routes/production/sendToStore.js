/**
 * Production Send to Store Routes
 * Handles sending manufactured products from Factory to Factory Store (Depot)
 */

const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const ProductionSendToStore = require("../../models/ProductionSendToStore");
const Product = require("../../models/Product");
const Facility = require("../../models/Facility");
const Notification = require("../../models/Notification");
const { authenticate } = require("../../middleware/auth");
const { requireInventoryFactoryRole } = require("../../middleware/roleCheck");
const { requireApiPermission } = require("../../middleware/auth");

// Validation middleware
const validateShipment = [
  body("details").isArray({ min: 1 }).withMessage("At least one product detail is required"),
  body("details.*.product_id").isMongoId().withMessage("Valid product ID is required"),
  body("details.*.qty").isFloat({ min: 0.01 }).withMessage("Quantity must be greater than 0"),
  body("details.*.production_date").isISO8601().withMessage("Valid production date is required"),
  body("details.*.expiry_date").isISO8601().withMessage("Valid expiry date is required"),
  body("details.*.batch_no").notEmpty().trim().withMessage("Batch number is required"),
  body("details.*.note").optional().trim(),
];

/**
 * @route   GET /production/send-to-store
 * @desc    Get list of shipments with pagination and search
 * @access  Private (Inventory Factory role only)
 */
router.get(
  "/",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("production:send-to-store:read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search = "", status } = req.query;
      const { facility_id } = req.userContext;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query = { facility_id };

      if (status) {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { ref: { $regex: search, $options: "i" } },
          { "details.batch_no": { $regex: search, $options: "i" } },
        ];
      }

      // Get shipments with pagination
      const [shipments, total] = await Promise.all([
        ProductionSendToStore.find(query)
          .populate("facility_id", "name type")
          .populate("facility_store_id", "name type")
          .populate("user_id", "username")
          .populate({
            path: "details.product_id",
            select: "sku erp_id bangla_name english_name ctn_pcs wt_pcs",
          })
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limitNum),
        ProductionSendToStore.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          shipments,
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching shipments:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching shipments",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /production/send-to-store
 * @desc    Create new shipment from factory to factory store
 * @access  Private (Inventory Factory role only)
 */
router.post(
  "/",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("production:send-to-store:create"),
  validateShipment,
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

      const { details } = req.body;
      const { user_id, facility_id, factory_store_id } = req.userContext;

      // Verify facility_id and factory_store_id exist and are correct types
      const [facility, factoryStore] = await Promise.all([
        Facility.findById(facility_id),
        Facility.findById(factory_store_id),
      ]);

      if (!facility || facility.type !== "Factory") {
        return res.status(400).json({
          success: false,
          message: "Invalid facility. Must be a Factory type",
        });
      }

      if (!factoryStore || factoryStore.type !== "Depot") {
        return res.status(400).json({
          success: false,
          message: "Invalid factory store. Must be a Depot type",
        });
      }

      // Create the shipment
      const shipment = new ProductionSendToStore({
        user_id,
        facility_id,
        facility_store_id: factory_store_id, // Use factory_store_id from userContext
        details,
        created_by: user_id,
        updated_by: user_id,
      });

      await shipment.save();

      // Create notification for inventory users at destination store
      try {
        const totalQty = details.reduce((sum, detail) => {
          const qty =
            typeof detail.qty === "object" && detail.qty.$numberDecimal
              ? parseFloat(detail.qty.$numberDecimal)
              : parseFloat(detail.qty);
          return sum + qty;
        }, 0);

        await Notification.createForRoleAtFacility("Inventory", factory_store_id, {
          type: "shipment_pending",
          title: "New Shipment Awaiting Receipt",
          message: `Shipment ${shipment.ref || "pending"} from ${facility.name} with ${details.length} products (${totalQty.toFixed(2)} cartons total) is ready for receipt.`,
          shipment_id: shipment._id,
          priority: "high",
          action_url: `/inventory/receive-from-production`,
          action_label: "Receive Goods",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
        console.log(`✅ Notification created for Inventory users at ${factoryStore.name}`);
      } catch (notifError) {
        console.error("⚠️  Failed to create notification:", notifError);
        // Don't fail the shipment creation if notification fails
      }

      // Populate product details for response
      await shipment.populate([
        {
          path: "details.product_id",
          select: "sku erp_id bangla_name english_name ctn_pcs wt_pcs category_id",
          populate: {
            path: "category_id",
            select: "name",
          },
        },
        { path: "facility_id", select: "name type" },
        { path: "facility_store_id", select: "name type" },
        { path: "user_id", select: "username" },
      ]);

      res.status(201).json({
        success: true,
        message: "Shipment created successfully",
        data: shipment,
      });
    } catch (error) {
      console.error("Error creating shipment:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error creating shipment",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /production/send-to-store/all
 * @desc    Get all shipments with pagination and filters
 * @access  Private (Inventory Factory role only)
 */
router.get(
  "/",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("production:send-to-store:read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, start_date, end_date, batch_no, status } = req.query;

      const { facility_id } = req.userContext;

      // Build query
      const query = { facility_id };

      if (start_date && end_date) {
        query.created_at = {
          $gte: new Date(start_date),
          $lte: new Date(end_date),
        };
      }

      if (batch_no) {
        query["details.batch_no"] = { $regex: batch_no, $options: "i" };
      }

      if (status) {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [shipments, totalCount] = await Promise.all([
        ProductionSendToStore.find(query)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate([
            { path: "facility_id", select: "name type" },
            { path: "facility_store_id", select: "name type" },
            { path: "user_id", select: "username" },
          ])
          .lean(),
        ProductionSendToStore.countDocuments(query),
      ]);

      // Add computed fields
      const shipmentsWithTotals = shipments.map((shipment) => ({
        ...shipment,
        total_items: shipment.details.length,
        total_qty: shipment.details.reduce(
          (sum, detail) => sum + parseFloat(detail.qty.toString()),
          0
        ),
      }));

      res.json({
        success: true,
        data: shipmentsWithTotals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching shipments:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching shipments",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /production/send-to-store/:id
 * @desc    Get single shipment by ID
 * @access  Private (Inventory Factory role only)
 */
router.get(
  "/:id",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("production:send-to-store:read"),
  [param("id").isMongoId().withMessage("Valid shipment ID is required")],
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
      const shipment = await ProductionSendToStore.findOne({
        _id: req.params.id,
        facility_id,
      }).populate([
        {
          path: "details.product_id",
          select:
            "sku erp_id bangla_name english_name unit_pcs_per_ctn unit_weight_kg category subcategory",
          populate: [
            { path: "category", select: "name" },
            { path: "subcategory", select: "name" },
          ],
        },
        { path: "facility_id", select: "name type location" },
        { path: "facility_store_id", select: "name type location" },
        { path: "user_id", select: "username" },
        { path: "created_by", select: "username" },
        { path: "updated_by", select: "username" },
      ]);

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: "Shipment not found",
        });
      }

      res.json({
        success: true,
        data: shipment,
      });
    } catch (error) {
      console.error("Error fetching shipment:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching shipment",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /production/send-to-store/:id
 * @desc    Update shipment (only if status is draft)
 * @access  Private (Inventory Factory role only)
 */
router.put(
  "/:id",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("production:send-to-store:update"),
  [param("id").isMongoId().withMessage("Valid shipment ID is required")],
  validateShipment,
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

      const { facility_id, user_id } = req.userContext;
      const { details } = req.body;

      const shipment = await ProductionSendToStore.findOne({
        _id: req.params.id,
        facility_id,
      });

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: "Shipment not found",
        });
      }

      if (shipment.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot update cancelled shipment",
        });
      }

      // Update fields
      shipment.details = details;
      shipment.updated_by = user_id;

      await shipment.save();

      await shipment.populate([
        {
          path: "details.product_id",
          select: "sku erp_id bangla_name english_name unit_pcs_per_ctn category subcategory",
          populate: [
            { path: "category", select: "name" },
            { path: "subcategory", select: "name" },
          ],
        },
        { path: "facility_id", select: "name type" },
        { path: "facility_store_id", select: "name type" },
      ]);

      res.json({
        success: true,
        message: "Shipment updated successfully",
        data: shipment,
      });
    } catch (error) {
      console.error("Error updating shipment:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error updating shipment",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /production/send-to-store/:id
 * @desc    Cancel/soft delete shipment
 * @access  Private (Inventory Factory role only)
 */
router.delete(
  "/:id",
  authenticate,
  requireInventoryFactoryRole,
  requireApiPermission("production:send-to-store:delete"),
  [param("id").isMongoId().withMessage("Valid shipment ID is required")],
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

      const { facility_id, user_id } = req.userContext;

      const shipment = await ProductionSendToStore.findOne({
        _id: req.params.id,
        facility_id,
      });

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: "Shipment not found",
        });
      }

      if (shipment.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Shipment is already cancelled",
        });
      }

      shipment.status = "cancelled";
      shipment.updated_by = user_id;
      await shipment.save();

      res.json({
        success: true,
        message: "Shipment cancelled successfully",
        data: shipment,
      });
    } catch (error) {
      console.error("Error cancelling shipment:", error);
      res.status(500).json({
        success: false,
        message: "Error cancelling shipment",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /production/send-to-store/batch-check
 * @desc    Check if batch number is available
 * @access  Private (Inventory Factory role only)
 */
router.get(
  "/batch-check",
  authenticate,
  requireInventoryFactoryRole,
  [
    query("batch_no").notEmpty().withMessage("Batch number is required"),
    query("product_id").isMongoId().withMessage("Valid product ID is required"),
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

      const { batch_no, product_id } = req.query;

      const existing = await ProductionSendToStore.findOne({
        "details.batch_no": batch_no,
        "details.product_id": product_id,
        status: { $ne: "cancelled" },
      }).select("ref");

      res.json({
        success: true,
        available: !existing,
        message: existing
          ? `Batch number already exists in shipment ${existing.ref}`
          : "Batch number is available",
      });
    } catch (error) {
      console.error("Error checking batch number:", error);
      res.status(500).json({
        success: false,
        message: "Error checking batch number",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
