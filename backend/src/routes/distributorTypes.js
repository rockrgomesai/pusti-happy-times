/**
 * Distributor Type Routes
 * Pusti Happy Times - Distributor Type Management Endpoints
 *
 * This file contains all distributor type-related routes including
 * CRUD operations with proper authentication and authorization.
 *
 * Features:
 * - Full CRUD operations for distributor types
 * - Role-based access control
 * - API permission validation
 * - Audit trail for all operations
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const DistributorType = require("../models/DistributorType");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */

// Distributor type validation rules
const distributorTypeValidation = [
  body("type_name")
    .trim()
    .notEmpty()
    .withMessage("Distributor type name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Type name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("active").optional().isBoolean().withMessage("Active must be a boolean value"),
];

// ID parameter validation
const idValidation = [param("id").isMongoId().withMessage("Invalid distributor type ID format")];

/**
 * Helper Functions
 */

/**
 * Handle validation errors
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

/**
 * Get current user ID from request
 */
const getCurrentUserId = (req) => {
  return req.user?.id || req.user?._id;
};

/**
 * Routes
 */

/**
 * @route   GET /api/distributor-types
 * @desc    Get all distributor types
 * @access  Private - requires distributor_types:read permission
 */
router.get("/", authenticate, requireApiPermission("distributor_types:read"), async (req, res) => {
  try {
    const { sort = "type_name", active } = req.query;

    // Build query filter
    const filter = {};
    if (active !== undefined) {
      filter.active = active === "true";
    }

    const sortOptions = { [sort]: 1 };

    // Get all distributor types without pagination
    const distributorTypes = await DistributorType.find(filter)
      .sort(sortOptions)
      .populate("created_by", "username")
      .populate("updated_by", "username");

    // Get total count
    const totalCount = distributorTypes.length;

    res.json({
      success: true,
      data: distributorTypes,
      pagination: {
        totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching distributor types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch distributor types",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/distributor-types/active
 * @desc    Get all active distributor types (for dropdown lists)
 * @access  Private - requires distributor_types:read permission
 */
router.get("/active", authenticate, requireApiPermission("distributor_types:read"), async (req, res) => {
  try {
    const distributorTypes = await DistributorType.getActiveTypes();

    res.json({
      success: true,
      data: distributorTypes,
    });
  } catch (error) {
    console.error("Error fetching active distributor types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active distributor types",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/distributor-types/:id
 * @desc    Get distributor type by ID
 * @access  Private - requires distributor_types:read permission
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("distributor_types:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const distributorType = await DistributorType.findById(req.params.id)
        .populate("created_by", "username email")
        .populate("updated_by", "username email");

      if (!distributorType) {
        return res.status(404).json({
          success: false,
          message: "Distributor type not found",
        });
      }

      res.json({
        success: true,
        data: distributorType,
      });
    } catch (error) {
      console.error("Error fetching distributor type:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch distributor type",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/distributor-types
 * @desc    Create new distributor type
 * @access  Private - requires distributor_types:create permission
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("distributor_types:create"),
  distributorTypeValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type_name, description, active } = req.body;
      const userId = getCurrentUserId(req);

      // Check if distributor type already exists
      const existingType = await DistributorType.findByName(type_name);
      if (existingType) {
        return res.status(409).json({
          success: false,
          message: "Distributor type with this name already exists",
        });
      }

      // Create new distributor type
      const distributorType = new DistributorType({
        type_name,
        description: description || "",
        active: active !== undefined ? active : true,
        created_by: userId,
        updated_by: userId,
      });

      await distributorType.save();

      res.status(201).json({
        success: true,
        message: "Distributor type created successfully",
        data: distributorType,
      });
    } catch (error) {
      console.error("Error creating distributor type:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Distributor type with this name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create distributor type",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/distributor-types/:id
 * @desc    Update distributor type
 * @access  Private - requires distributor_types:update permission
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("distributor_types:update"),
  idValidation,
  distributorTypeValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type_name, description, active } = req.body;
      const userId = getCurrentUserId(req);

      // Check if distributor type exists
      const distributorType = await DistributorType.findById(req.params.id);
      if (!distributorType) {
        return res.status(404).json({
          success: false,
          message: "Distributor type not found",
        });
      }

      // Check if new name conflicts with another distributor type
      if (type_name !== distributorType.type_name) {
        const existingType = await DistributorType.findByName(type_name);
        if (existingType) {
          return res.status(409).json({
            success: false,
            message: "Another distributor type with this name already exists",
          });
        }
      }

      // Update distributor type
      distributorType.type_name = type_name;
      distributorType.description = description || "";
      distributorType.active = active !== undefined ? active : distributorType.active;
      distributorType.updated_by = userId;
      distributorType.updated_at = Date.now();

      await distributorType.save();

      res.json({
        success: true,
        message: "Distributor type updated successfully",
        data: distributorType,
      });
    } catch (error) {
      console.error("Error updating distributor type:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Another distributor type with this name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update distributor type",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/distributor-types/:id
 * @desc    Delete distributor type
 * @access  Private - requires distributor_types:delete permission
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("distributor_types:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const distributorType = await DistributorType.findById(req.params.id);

      if (!distributorType) {
        return res.status(404).json({
          success: false,
          message: "Distributor type not found",
        });
      }

      // Check if distributor type is being used by any distributors
      const Distributor = require("../models/Distributor");
      const distributorCount = await Distributor.countDocuments({
        distributor_type: distributorType.type_name,
      });

      if (distributorCount > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot delete distributor type. It is currently being used by ${distributorCount} distributor(s).`,
        });
      }

      await DistributorType.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Distributor type deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting distributor type:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete distributor type",
        error: error.message,
      });
    }
  }
);

module.exports = router;
