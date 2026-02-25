/**
 * Delivery Depot Routes
 * Pusti Happy Times - Delivery Depot Management API
 *
 * Provides CRUD operations for delivery depot master data.
 * Access: SuperAdmin only
 */

const express = require("express");
const router = express.Router();
const DeliveryDepot = require("../models/DeliveryDepot");
const { authenticate, requireApiPermission } = require("../middleware/auth");

/**
 * @route   GET /api/v1/delivery-depots
 * @desc    Get all delivery depots with pagination, search, and filtering
 * @access  Private (delivery_depots:read)
 */
router.get(
  "/",
  authenticate,
  requireApiPermission("delivery_depots:read"),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        sort_by = "name",
        sort_order = "asc",
        active,
        district,
        division,
      } = req.query;

      // Build filter query
      const filter = {};

      // Search filter
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
          { district: { $regex: search, $options: "i" } },
          { division: { $regex: search, $options: "i" } },
        ];
      }

      // Active filter
      if (active !== undefined) {
        filter.active = active === "true";
      }

      // District filter
      if (district) {
        filter.district = district;
      }

      // Division filter
      if (division) {
        filter.division = division;
      }

      // Calculate pagination
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Sort order
      const sortOrder = sort_order === "desc" ? -1 : 1;
      const sortObj = { [sort_by]: sortOrder };

      // Execute query with pagination
      const [depots, total] = await Promise.all([
        DeliveryDepot.find(filter)
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .select("-__v")
          .lean(),
        DeliveryDepot.countDocuments(filter),
      ]);

      // Return response
      res.status(200).json({
        success: true,
        count: depots.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: depots,
      });
    } catch (error) {
      console.error("Error fetching delivery depots:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch delivery depots",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/delivery-depots/active
 * @desc    Get all active delivery depots (for dropdowns)
 * @access  Private (delivery_depots:read)
 */
router.get(
  "/active",
  authenticate,
  requireApiPermission("delivery_depots:read"),
  async (req, res) => {
    try {
      const depots = await DeliveryDepot.getActiveDepots();

      res.status(200).json({
        success: true,
        count: depots.length,
        data: depots,
      });
    } catch (error) {
      console.error("Error fetching active delivery depots:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch active delivery depots",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/delivery-depots/districts
 * @desc    Get list of valid districts
 * @access  Private (delivery_depots:read)
 */
router.get(
  "/districts",
  authenticate,
  requireApiPermission("delivery_depots:read"),
  async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        data: DeliveryDepot.DISTRICTS,
      });
    } catch (error) {
      console.error("Error fetching districts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch districts",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/delivery-depots/divisions
 * @desc    Get list of valid divisions
 * @access  Private (delivery_depots:read)
 */
router.get(
  "/divisions",
  authenticate,
  requireApiPermission("delivery_depots:read"),
  async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        data: DeliveryDepot.DIVISIONS,
      });
    } catch (error) {
      console.error("Error fetching divisions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch divisions",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/v1/delivery-depots/:id
 * @desc    Get a single delivery depot by ID
 * @access  Private (delivery_depots:read)
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("delivery_depots:read"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const depot = await DeliveryDepot.findById(id).select("-__v").lean();

      if (!depot) {
        return res.status(404).json({
          success: false,
          message: "Delivery depot not found",
        });
      }

      res.status(200).json({
        success: true,
        data: depot,
      });
    } catch (error) {
      console.error("Error fetching delivery depot:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch delivery depot",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/v1/delivery-depots
 * @desc    Create a new delivery depot
 * @access  Private (delivery_depots:create)
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("delivery_depots:create"),
  async (req, res) => {
    try {
      const { name, address, district, division, active } = req.body;

      // Validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Delivery depot name is required",
        });
      }

      // Check for duplicate name
      const existingDepot = await DeliveryDepot.findByName(name.trim());
      if (existingDepot) {
        return res.status(409).json({
          success: false,
          message: "A delivery depot with this name already exists",
        });
      }

      // Validate district if provided
      if (district && !DeliveryDepot.DISTRICTS.includes(district)) {
        return res.status(400).json({
          success: false,
          message: `Invalid district: ${district}`,
        });
      }

      // Validate division if provided
      if (division && !DeliveryDepot.DIVISIONS.includes(division)) {
        return res.status(400).json({
          success: false,
          message: `Invalid division: ${division}`,
        });
      }

      // Create new depot
      const depot = new DeliveryDepot({
        name: name.trim(),
        address: address?.trim() || null,
        district: district || null,
        division: division || null,
        active: active !== undefined ? active : true,
        created_by: req.user._id,
        updated_by: req.user._id,
      });

      await depot.save();

      res.status(201).json({
        success: true,
        message: "Delivery depot created successfully",
        data: depot,
      });
    } catch (error) {
      console.error("Error creating delivery depot:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A delivery depot with this name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create delivery depot",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/v1/delivery-depots/:id
 * @desc    Update a delivery depot
 * @access  Private (delivery_depots:update)
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("delivery_depots:update"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, address, district, division, active } = req.body;

      // Find existing depot
      const depot = await DeliveryDepot.findById(id);

      if (!depot) {
        return res.status(404).json({
          success: false,
          message: "Delivery depot not found",
        });
      }

      // Validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Delivery depot name is required",
        });
      }

      // Check for duplicate name (excluding current depot)
      const isNameAvailable = await DeliveryDepot.isNameAvailable(
        name.trim(),
        id
      );
      if (!isNameAvailable) {
        return res.status(409).json({
          success: false,
          message: "A delivery depot with this name already exists",
        });
      }

      // Validate district if provided
      if (district && !DeliveryDepot.DISTRICTS.includes(district)) {
        return res.status(400).json({
          success: false,
          message: `Invalid district: ${district}`,
        });
      }

      // Validate division if provided
      if (division && !DeliveryDepot.DIVISIONS.includes(division)) {
        return res.status(400).json({
          success: false,
          message: `Invalid division: ${division}`,
        });
      }

      // Update fields
      depot.name = name.trim();
      depot.address = address?.trim() || null;
      depot.district = district || null;
      depot.division = division || null;
      depot.active = active !== undefined ? active : depot.active;
      depot.updated_by = req.user._id;
      depot.updated_at = new Date();

      await depot.save();

      res.status(200).json({
        success: true,
        message: "Delivery depot updated successfully",
        data: depot,
      });
    } catch (error) {
      console.error("Error updating delivery depot:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A delivery depot with this name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update delivery depot",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/delivery-depots/:id
 * @desc    Delete a delivery depot
 * @access  Private (delivery_depots:delete)
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("delivery_depots:delete"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const depot = await DeliveryDepot.findById(id);

      if (!depot) {
        return res.status(404).json({
          success: false,
          message: "Delivery depot not found",
        });
      }

      // Check if depot is in use by any distributors
      const Distributor = require("../models/Distributor");
      const distributorsUsingDepot = await Distributor.countDocuments({
        delivery_depot: depot.name,
      });

      if (distributorsUsingDepot > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete delivery depot. It is currently assigned to ${distributorsUsingDepot} distributor(s)`,
        });
      }

      await DeliveryDepot.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Delivery depot deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting delivery depot:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete delivery depot",
        error: error.message,
      });
    }
  }
);

module.exports = router;
