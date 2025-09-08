/**
 * Permission Routes
 * Pusti Happy Times - Permission Management Endpoints
 *
 * This file contains all permission-related routes including
 * CRUD operations for API permissions and page permissions.
 *
 * Features:
 * - Full CRUD operations for API and Page permissions
 * - Role-based access control
 * - Permission validation
 * - Comprehensive permission management
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const {
  ApiPermission,
  PagePermission,
  RoleApiPermission,
  RolePagePermission,
} = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */

// API Permission validation rules
const apiPermissionValidation = [
  body("api_permissions")
    .trim()
    .notEmpty()
    .withMessage("API permission is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("API permission must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9:_-]+$/)
    .withMessage(
      "API permission can only contain letters, numbers, colons, underscores, and hyphens"
    ),
];

// Page Permission validation rules
const pagePermissionValidation = [
  body("pg_permissions")
    .trim()
    .notEmpty()
    .withMessage("Page permission is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Page permission must be between 2 and 100 characters")
    .matches(/^[a-zA-Z0-9:/_-]+$/)
    .withMessage(
      "Page permission can only contain letters, numbers, colons, slashes, underscores, and hyphens"
    ),
];

// ID parameter validation
const idValidation = [
  param("id").isMongoId().withMessage("Invalid permission ID format"),
];

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
 * API PERMISSION ROUTES
 */

/**
 * @route   GET /api/permissions/api
 * @desc    Get all API permissions
 * @access  Private - requires read:permission
 */
router.get(
  "/api",
  authenticate,
  requireApiPermission("read:permission"),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, sort = "api_permissions" } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sort]: 1 },
      };

      // Calculate skip value for pagination
      const skip = (options.page - 1) * options.limit;

      // Get API permissions with pagination
      const apiPermissions = await ApiPermission.find({})
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit);

      // Get total count for pagination
      const totalCount = await ApiPermission.countDocuments();
      const totalPages = Math.ceil(totalCount / options.limit);

      res.json({
        success: true,
        data: apiPermissions,
        pagination: {
          page: options.page,
          limit: options.limit,
          totalCount,
          totalPages,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching API permissions:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching API permissions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/permissions/api/:id
 * @desc    Get API permission by ID
 * @access  Private - requires read:permission
 */
router.get(
  "/api/:id",
  authenticate,
  requireApiPermission("read:permission"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const apiPermission = await ApiPermission.findById(req.params.id);

      if (!apiPermission) {
        return res.status(404).json({
          success: false,
          message: "API permission not found",
        });
      }

      // Get roles that have this permission
      const rolesWithPermission = await RoleApiPermission.find({
        api_permission_id: req.params.id,
      }).populate("role_id", "role");

      res.json({
        success: true,
        data: {
          ...apiPermission.toObject(),
          assignedRoles: rolesWithPermission.map((rp) => rp.role_id),
        },
      });
    } catch (error) {
      console.error("Error fetching API permission:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching API permission",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/permissions/api
 * @desc    Create new API permission
 * @access  Private - requires create:permission
 */
router.post(
  "/api",
  authenticate,
  requireApiPermission("create:permission"),
  apiPermissionValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { api_permissions } = req.body;

      // Check if API permission already exists
      const existingPermission = await ApiPermission.findOne({
        api_permissions: api_permissions.trim(),
      });
      if (existingPermission) {
        return res.status(400).json({
          success: false,
          message: "API permission already exists",
        });
      }

      // Create new API permission
      const newApiPermission = new ApiPermission({
        api_permissions: api_permissions.trim(),
      });

      await newApiPermission.save();

      res.status(201).json({
        success: true,
        message: "API permission created successfully",
        data: newApiPermission,
      });
    } catch (error) {
      console.error("Error creating API permission:", error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "API permission already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating API permission",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/permissions/api/:id
 * @desc    Update API permission
 * @access  Private - requires update:permission
 */
router.put(
  "/api/:id",
  authenticate,
  requireApiPermission("update:permission"),
  idValidation,
  apiPermissionValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { api_permissions } = req.body;

      // Check if API permission exists
      const existingPermission = await ApiPermission.findById(req.params.id);
      if (!existingPermission) {
        return res.status(404).json({
          success: false,
          message: "API permission not found",
        });
      }

      // Check if new permission name already exists (excluding current)
      const duplicatePermission = await ApiPermission.findOne({
        api_permissions: api_permissions.trim(),
        _id: { $ne: req.params.id },
      });
      if (duplicatePermission) {
        return res.status(400).json({
          success: false,
          message: "API permission already exists",
        });
      }

      // Update API permission
      const updatedPermission = await ApiPermission.findByIdAndUpdate(
        req.params.id,
        { api_permissions: api_permissions.trim() },
        {
          new: true,
          runValidators: true,
        }
      );

      res.json({
        success: true,
        message: "API permission updated successfully",
        data: updatedPermission,
      });
    } catch (error) {
      console.error("Error updating API permission:", error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "API permission already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating API permission",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/permissions/api/:id
 * @desc    Delete API permission
 * @access  Private - requires delete:permission
 */
router.delete(
  "/api/:id",
  authenticate,
  requireApiPermission("delete:permission"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if API permission exists
      const apiPermission = await ApiPermission.findById(req.params.id);
      if (!apiPermission) {
        return res.status(404).json({
          success: false,
          message: "API permission not found",
        });
      }

      // Check if permission is assigned to any roles
      const roleCount = await RoleApiPermission.countDocuments({
        api_permission_id: req.params.id,
      });
      if (roleCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete API permission. It is assigned to ${roleCount} role(s).`,
        });
      }

      // Delete API permission
      await ApiPermission.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "API permission deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting API permission:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting API permission",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * PAGE PERMISSION ROUTES
 */

/**
 * @route   GET /api/permissions/page
 * @desc    Get all page permissions
 * @access  Private - requires read:permission
 */
router.get(
  "/page",
  authenticate,
  requireApiPermission("read:permission"),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, sort = "pg_permissions" } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sort]: 1 },
      };

      // Calculate skip value for pagination
      const skip = (options.page - 1) * options.limit;

      // Get page permissions with pagination
      const pagePermissions = await PagePermission.find({})
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit);

      // Get total count for pagination
      const totalCount = await PagePermission.countDocuments();
      const totalPages = Math.ceil(totalCount / options.limit);

      res.json({
        success: true,
        data: pagePermissions,
        pagination: {
          page: options.page,
          limit: options.limit,
          totalCount,
          totalPages,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching page permissions:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching page permissions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/permissions/page/:id
 * @desc    Get page permission by ID
 * @access  Private - requires read:permission
 */
router.get(
  "/page/:id",
  authenticate,
  requireApiPermission("read:permission"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const pagePermission = await PagePermission.findById(req.params.id);

      if (!pagePermission) {
        return res.status(404).json({
          success: false,
          message: "Page permission not found",
        });
      }

      // Get roles that have this permission
      const rolesWithPermission = await RolePagePermission.find({
        page_permission_id: req.params.id,
      }).populate("role_id", "role");

      res.json({
        success: true,
        data: {
          ...pagePermission.toObject(),
          assignedRoles: rolesWithPermission.map((rp) => rp.role_id),
        },
      });
    } catch (error) {
      console.error("Error fetching page permission:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching page permission",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/permissions/page
 * @desc    Create new page permission
 * @access  Private - requires create:permission
 */
router.post(
  "/page",
  authenticate,
  requireApiPermission("create:permission"),
  pagePermissionValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pg_permissions } = req.body;

      // Check if page permission already exists
      const existingPermission = await PagePermission.findOne({
        pg_permissions: pg_permissions.trim(),
      });
      if (existingPermission) {
        return res.status(400).json({
          success: false,
          message: "Page permission already exists",
        });
      }

      // Create new page permission
      const newPagePermission = new PagePermission({
        pg_permissions: pg_permissions.trim(),
      });

      await newPagePermission.save();

      res.status(201).json({
        success: true,
        message: "Page permission created successfully",
        data: newPagePermission,
      });
    } catch (error) {
      console.error("Error creating page permission:", error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Page permission already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating page permission",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/permissions/page/:id
 * @desc    Update page permission
 * @access  Private - requires update:permission
 */
router.put(
  "/page/:id",
  authenticate,
  requireApiPermission("update:permission"),
  idValidation,
  pagePermissionValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pg_permissions } = req.body;

      // Check if page permission exists
      const existingPermission = await PagePermission.findById(req.params.id);
      if (!existingPermission) {
        return res.status(404).json({
          success: false,
          message: "Page permission not found",
        });
      }

      // Check if new permission name already exists (excluding current)
      const duplicatePermission = await PagePermission.findOne({
        pg_permissions: pg_permissions.trim(),
        _id: { $ne: req.params.id },
      });
      if (duplicatePermission) {
        return res.status(400).json({
          success: false,
          message: "Page permission already exists",
        });
      }

      // Update page permission
      const updatedPermission = await PagePermission.findByIdAndUpdate(
        req.params.id,
        { pg_permissions: pg_permissions.trim() },
        {
          new: true,
          runValidators: true,
        }
      );

      res.json({
        success: true,
        message: "Page permission updated successfully",
        data: updatedPermission,
      });
    } catch (error) {
      console.error("Error updating page permission:", error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Page permission already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating page permission",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/permissions/page/:id
 * @desc    Delete page permission
 * @access  Private - requires delete:permission
 */
router.delete(
  "/page/:id",
  authenticate,
  requireApiPermission("delete:permission"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if page permission exists
      const pagePermission = await PagePermission.findById(req.params.id);
      if (!pagePermission) {
        return res.status(404).json({
          success: false,
          message: "Page permission not found",
        });
      }

      // Check if permission is assigned to any roles
      const roleCount = await RolePagePermission.countDocuments({
        page_permission_id: req.params.id,
      });
      if (roleCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete page permission. It is assigned to ${roleCount} role(s).`,
        });
      }

      // Delete page permission
      await PagePermission.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Page permission deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting page permission:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting page permission",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
