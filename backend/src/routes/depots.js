/**
 * Depot Routes (LEGACY - For Backward Compatibility)
 * Pusti Happy Times - Depot Management Endpoints
 *
 * This file is kept for backward compatibility.
 * New code should use /api/facilities instead.
 * Depots are now stored in the facilities collection with type='Depot'.
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const { Facility } = require("../models"); // Now using Facility model
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */
const depotValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Depot name is required")
    .isLength({ min: 1, max: 120 })
    .withMessage("Depot name must be between 1 and 120 characters"),
];

const idValidation = [
  param("id").isMongoId().withMessage("Invalid depot ID format"),
];

/**
 * Helpers
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }
  next();
};

const getCurrentUserId = (req) => req.user?.id || req.user?._id;

/**
 * Routes
 */

// GET /api/depots - list depots (now filters facilities by type='Depot')
router.get(
  "/",
  authenticate,
  requireApiPermission("depots:read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = "name" } = req.query;
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      const sortField = typeof sort === "string" ? sort : "name";
      const skip = (pageNumber - 1) * limitNumber;

      const depots = await Facility.find({ type: "Depot" })
        .sort({ [sortField]: 1 })
        .skip(skip)
        .limit(limitNumber)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      const totalCount = await Facility.countDocuments({ type: "Depot" });
      const totalPages = Math.ceil(totalCount / limitNumber) || 1;

      res.json({
        success: true,
        data: depots,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          totalCount,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching depots:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching depots",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// GET /api/depots/:id - single depot
router.get(
  "/:id",
  authenticate,
  requireApiPermission("depots:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const depot = await Facility.findOne({ _id: req.params.id, type: "Depot" })
        .populate("created_by", "username")
        .populate("updated_by", "username");

      if (!depot) {
        return res.status(404).json({
          success: false,
          message: "Depot not found",
        });
      }

      res.json({
        success: true,
        data: depot,
      });
    } catch (error) {
      console.error("Error fetching depot:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching depot",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// POST /api/depots - create depot (now creates a facility with type='Depot')
router.post(
  "/",
  authenticate,
  requireApiPermission("depots:create"),
  depotValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.body;
      const currentUserId = getCurrentUserId(req);

      const existingDepot = await Facility.findOne({ name, type: "Depot" });
      if (existingDepot) {
        return res.status(400).json({
          success: false,
          message: "Depot already exists",
        });
      }

      const newDepot = new Facility({
        name,
        type: "Depot",
        created_by: currentUserId,
        updated_by: currentUserId,
      });

      await newDepot.save();
      await newDepot.populate("created_by", "username");
      await newDepot.populate("updated_by", "username");

      res.status(201).json({
        success: true,
        message: "Depot created successfully",
        data: newDepot,
      });
    } catch (error) {
      console.error("Error creating depot:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Depot already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating depot",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// PUT /api/depots/:id - update depot
router.put(
  "/:id",
  authenticate,
  requireApiPermission("depots:update"),
  idValidation,
  depotValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.body;
      const currentUserId = getCurrentUserId(req);

      const existingDepot = await Facility.findOne({ _id: req.params.id, type: "Depot" });
      if (!existingDepot) {
        return res.status(404).json({
          success: false,
          message: "Depot not found",
        });
      }

      const duplicate = await Facility.findOne({
        name,
        type: "Depot",
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Depot name already exists",
        });
      }

      const updatedDepot = await Facility.findByIdAndUpdate(
        req.params.id,
        {
          name,
          updated_by: currentUserId,
          updated_at: new Date(),
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("created_by", "username")
        .populate("updated_by", "username");

      res.json({
        success: true,
        message: "Depot updated successfully",
        data: updatedDepot,
      });
    } catch (error) {
      console.error("Error updating depot:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Depot name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating depot",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// DELETE /api/depots/:id - delete depot
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("depots:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const depot = await Facility.findOne({ _id: req.params.id, type: "Depot" });
      if (!depot) {
        return res.status(404).json({
          success: false,
          message: "Depot not found",
        });
      }

      await Facility.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Depot deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting depot:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting depot",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * Get facilities assigned to current facility employee
 * @route   GET /api/v1/depots/my-facilities
 * @access  Private (facility employees only)
 */
router.get(
  "/my-facilities",
  authenticate,
  async (req, res) => {
    try {
      // Check if user is a facility employee
      const { user_type, employee_type, facility_assignments } = req.userContext || {};
      
      if (user_type !== 'employee' || employee_type !== 'facility') {
        return res.status(403).json({
          success: false,
          message: "Access denied. Facility employee access required.",
        });
      }

      if (!facility_assignments) {
        return res.json({
          success: true,
          data: { depots: [], factories: [] },
        });
      }

      // Fetch assigned depots (type='Depot' from facilities)
      const depots = await Facility.find({
        _id: { $in: facility_assignments.depot_ids || [] },
        type: 'Depot'
      }).select('depot_id name location active contact_person contact_mobile');

      // Fetch assigned factories (type='Factory' from facilities)
      let factories = [];
      if (facility_assignments.factory_ids?.length > 0) {
        factories = await Facility.find({
          _id: { $in: facility_assignments.factory_ids },
          type: 'Factory'
        }).select('factory_id name location active');
      }

      res.json({
        success: true,
        data: { depots, factories },
      });
    } catch (error) {
      console.error("Error fetching my facilities:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching facilities",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * Get facility-specific stats
 * @route   GET /api/v1/depots/stats
 * @access  Private (facility employees only)
 */
router.get(
  "/stats",
  authenticate,
  async (req, res) => {
    try {
      // Check if user is a facility employee
      const { user_type, employee_type, facility_assignments } = req.userContext || {};
      
      if (user_type !== 'employee' || employee_type !== 'facility') {
        return res.status(403).json({
          success: false,
          message: "Access denied. Facility employee access required.",
        });
      }

      // Mock stats for now - replace with actual calculations
      const stats = {
        totalInventory: 15240,
        pendingOrders: 23,
        todayShipments: 12,
        lowStockItems: 5,
      };

      // TODO: Implement actual stats calculation
      // Example:
      // const totalInventory = await Inventory.aggregate([
      //   { $match: { depot_id: { $in: facility_assignments.depot_ids } } },
      //   { $group: { _id: null, total: { $sum: '$quantity' } } }
      // ]);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching facility stats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching statistics",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;

