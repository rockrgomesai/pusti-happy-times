const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const InventoryRequisition = require("../../models/InventoryRequisition");
const Product = require("../../models/Product");
const { authenticate } = require("../../middleware/auth");
const { requireInventoryRole } = require("../../middleware/roleCheck");
const { requireApiPermission } = require("../../middleware/auth");

/**
 * @route   POST /api/v1/inventory/requisitions
 * @desc    Create a new requisition
 * @access  Inventory Factory/Depot roles
 */
router.post(
  "/",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:requisitions:write"),
  async (req, res) => {
    try {
      const { requisition_date, details, notes } = req.body;
      // For Inventory Depot users, use facility_id; for others, use factory_store_id
      const { facility_id, factory_store_id, user_id } = req.userContext;
      const fromDepotId = facility_id || factory_store_id;

      if (!fromDepotId) {
        return res.status(400).json({
          success: false,
          message: "Facility ID not found in user context",
        });
      }

      // Validate details
      if (!details || !Array.isArray(details) || details.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one product is required",
        });
      }

      // Validate each detail
      for (const detail of details) {
        if (!detail.product_id) {
          return res.status(400).json({
            success: false,
            message: "Product ID is required for all items",
          });
        }

        const qty = parseFloat(detail.qty);
        if (isNaN(qty) || qty <= 0) {
          return res.status(400).json({
            success: false,
            message: "Valid quantity is required for all items",
          });
        }

        // Verify product exists
        const product = await Product.findById(detail.product_id);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${detail.product_id}`,
          });
        }
      }

      // Generate requisition number
      const requisition_no = await InventoryRequisition.generateRequisitionNo();

      // Parse requisition date
      const reqDate = requisition_date ? new Date(requisition_date) : new Date();
      if (isNaN(reqDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid requisition date",
        });
      }

      // Create requisition
      const requisition = new InventoryRequisition({
        requisition_no,
        requisition_date: reqDate,
        from_depot_id: fromDepotId,
        details: details.map((detail) => ({
          product_id: detail.product_id,
          qty: mongoose.Types.Decimal128.fromString(String(detail.qty)),
          production_date: detail.production_date || null,
          expiry_date: detail.expiry_date || null,
          batch_no: detail.batch_no || "",
          note: detail.note || "",
        })),
        status: "submitted",
        created_by: user_id,
        updated_by: user_id,
      });

      await requisition.save();

      // Populate product details for response
      await requisition.populate("details.product_id", "sku erp_id name ctn_pcs");
      await requisition.populate("from_depot_id", "name code");
      await requisition.populate("created_by", "username");

      res.status(201).json({
        success: true,
        message: "Requisition created successfully",
        data: requisition,
      });
    } catch (error) {
      console.error("Error creating requisition:", error);
      res.status(500).json({
        success: false,
        message: "Error creating requisition",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/requisitions
 * @desc    Get all requisitions for user's facility
 * @access  Inventory Factory/Depot roles
 */
router.get(
  "/",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:requisitions:read"),
  async (req, res) => {
    try {
      // For Inventory Depot users, use facility_id; for others, use factory_store_id
      const { facility_id, factory_store_id } = req.userContext;
      const fromDepotId = facility_id || factory_store_id;
      const {
        page = 1,
        limit = 20,
        status,
        search = "",
        sort_by = "created_at",
        sort_order = "desc",
      } = req.query;

      if (!fromDepotId) {
        return res.status(400).json({
          success: false,
          message: "Facility ID not found in user context",
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query
      const query = { from_depot_id: fromDepotId };

      if (status) {
        query.status = status;
      }

      if (search) {
        query.requisition_no = { $regex: search, $options: "i" };
      }

      // Build sort
      const sortOptions = {};
      sortOptions[sort_by] = sort_order === "asc" ? 1 : -1;

      const [requisitions, total] = await Promise.all([
        InventoryRequisition.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .populate("from_depot_id", "name code")
          .populate("created_by", "username")
          .populate("details.product_id", "sku erp_id ctn_pcs wt_pcs")
          .lean(),
        InventoryRequisition.countDocuments(query),
      ]);

      // Convert Decimal128 to numbers
      const formattedRequisitions = requisitions.map((req) => ({
        ...req,
        details: req.details.map((detail) => ({
          ...detail,
          qty: detail.qty ? parseFloat(detail.qty.toString()) : 0,
        })),
      }));

      res.status(200).json({
        success: true,
        data: {
          requisitions: formattedRequisitions,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching requisitions:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching requisitions",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/inventory/requisitions/:id
 * @desc    Get requisition by ID
 * @access  Inventory Factory/Depot roles
 */
router.get(
  "/:id",
  authenticate,
  requireInventoryRole,
  requireApiPermission("inventory:requisitions:read"),
  async (req, res) => {
    try {
      const { id } = req.params;
      // For Inventory Depot users, use facility_id; for others, use factory_store_id
      const { facility_id, factory_store_id } = req.userContext;
      const fromDepotId = facility_id || factory_store_id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid requisition ID",
        });
      }

      const requisition = await InventoryRequisition.findOne({
        _id: id,
        from_depot_id: fromDepotId,
      })
        .populate("from_depot_id", "name code")
        .populate("created_by", "username")
        .populate("updated_by", "username")
        .populate("details.product_id", "sku erp_id ctn_pcs wt_pcs")
        .lean();

      if (!requisition) {
        return res.status(404).json({
          success: false,
          message: "Requisition not found",
        });
      }

      // Convert Decimal128 to numbers
      const formattedRequisition = {
        ...requisition,
        details: requisition.details.map((detail) => ({
          ...detail,
          qty: detail.qty ? parseFloat(detail.qty.toString()) : 0,
        })),
      };

      res.status(200).json({
        success: true,
        data: formattedRequisition,
      });
    } catch (error) {
      console.error("Error fetching requisition:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching requisition",
        error: error.message,
      });
    }
  }
);

module.exports = router;
