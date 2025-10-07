/**
 * Role Routes
 * Pusti Happy Times - Role Management Endpoints
 *
 * This file contains all role-related routes including
 * CRUD operations with proper authentication and authorization.
 *
 * Features:
 * - Full CRUD operations for roles
 * - Role-based access control
 * - API permission validation
 * - Role permission management
 * - Audit trail for all operations
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const {
  Role,
  User,
  RoleApiPermission,
  RolePagePermission,
  RoleSidebarMenuItem,
} = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */

// Role validation rules
const roleValidation = [
  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Role name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage(
      "Role name can only contain letters, numbers, spaces, underscores, and hyphens"
    ),
];

// ID parameter validation
const idValidation = [
  param("id").isMongoId().withMessage("Invalid role ID format"),
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
 * Get current user ID from request
 */
const getCurrentUserId = (req) => {
  return req.user?.id || req.user?._id;
};

/**
 * Routes
 */

/**
 * @route   GET /api/roles
 * @desc    Get all roles
 * @access  Private - requires roles:read permission
 */
router.get(
  "/",
  authenticate,
  requireApiPermission("roles:read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = "role" } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sort]: 1 },
      };

      // Calculate skip value for pagination
      const skip = (options.page - 1) * options.limit;

      // Get roles with pagination
      const roles = await Role.find({})
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit);

      // Get total count for pagination
      const totalCount = await Role.countDocuments();
      const totalPages = Math.ceil(totalCount / options.limit);

      // Get user count for each role
      const rolesWithUserCount = await Promise.all(
        roles.map(async (role) => {
          const userCount = await User.countDocuments({ role_id: role._id });
          return {
            ...role.toObject(),
            userCount,
          };
        })
      );

      res.json({
        success: true,
        data: rolesWithUserCount,
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
      console.error("Error fetching roles:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching roles",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/roles/:id
 * @desc    Get role by ID
 * @access  Private - requires roles:read permission
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("roles:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const role = await Role.findById(req.params.id);

      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // Get user count for this role
      const userCount = await User.countDocuments({ role_id: role._id });

      res.json({
        success: true,
        data: {
          ...role.toObject(),
          userCount,
        },
      });
    } catch (error) {
      console.error("Error fetching role:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching role",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/roles/:id/permissions
 * @desc    Get all permissions for a role
 * @access  Private - requires roles:read permission
 */
router.get(
  "/:id/permissions",
  authenticate,
  requireApiPermission("roles:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const roleId = req.params.id;

      // Verify role exists
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // Get all permissions for this role
      const [apiPermissions, pagePermissions, sidebarPermissions] =
        await Promise.all([
          RoleApiPermission.find({ role_id: roleId }).populate(
            "api_permission_id",
            "api_permissions"
          ),
          RolePagePermission.find({ role_id: roleId }).populate(
            "page_permission_id",
            "pg_permissions"
          ),
          RoleSidebarMenuItem.find({ role_id: roleId }).populate(
            "sidebar_menu_item_id",
            "label href icon"
          ),
        ]);

      res.json({
        success: true,
        data: {
          role: role.role,
          permissions: {
            api: apiPermissions.map((p) => p.api_permission_id),
            page: pagePermissions.map((p) => p.page_permission_id),
            sidebar: sidebarPermissions.map((p) => p.sidebar_menu_item_id),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching role permissions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/roles
 * @desc    Create new role
 * @access  Private - requires roles:create permission
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("roles:create"),
  roleValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { role } = req.body;

      // Check if role already exists
      const existingRole = await Role.findOne({ role: role.trim() });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: "Role already exists",
        });
      }

      // Create new role
      const newRole = new Role({
        role: role.trim(),
      });

      await newRole.save();

      res.status(201).json({
        success: true,
        message: "Role created successfully",
        data: newRole,
      });
    } catch (error) {
      console.error("Error creating role:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error creating role",
          errors: Object.values(error.errors).map((e) => e.message),
        });
      }
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Role already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Error creating role",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/roles/:id
 * @desc    Update role
 * @access  Private - requires roles:update permission
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("roles:update"),
  idValidation,
  roleValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { role } = req.body;

      // Check if role exists
      const existingRole = await Role.findById(req.params.id);
      if (!existingRole) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // Check if new role name already exists (excluding current role)
      const duplicateRole = await Role.findOne({
        role: role.trim(),
        _id: { $ne: req.params.id },
      });
      if (duplicateRole) {
        return res.status(400).json({
          success: false,
          message: "Role name already exists",
        });
      }

      // Update role
      const updatedRole = await Role.findByIdAndUpdate(
        req.params.id,
        { role: role.trim() },
        {
          new: true,
          runValidators: true,
        }
      );

      res.json({
        success: true,
        message: "Role updated successfully",
        data: updatedRole,
      });
    } catch (error) {
      console.error("Error updating role:", error);
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error updating role",
          errors: Object.values(error.errors).map((e) => e.message),
        });
      }
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Role name already exists",
        });
      }
      res.status(500).json({
        success: false,
        message: "Error updating role",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete role
 * @access  Private - requires roles:delete permission
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("roles:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if role exists
      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // Check if role is being used by any users
      const userCount = await User.countDocuments({ role_id: req.params.id });
      if (userCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete role. ${userCount} user(s) are assigned to this role.`,
        });
      }

      // Delete all role permissions first
      await Promise.all([
        RoleApiPermission.deleteMany({ role_id: req.params.id }),
        RolePagePermission.deleteMany({ role_id: req.params.id }),
        RoleSidebarMenuItem.deleteMany({ role_id: req.params.id }),
      ]);

      // Delete role
      await Role.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Role deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting role",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/roles/:id/permissions/api
 * @desc    Assign API permissions to role
 * @access  Private - requires roles:update permission
 */
router.post(
  "/:id/permissions/api",
  authenticate,
  requireApiPermission("roles:update"),
  idValidation,
  body("apiPermissionIds")
    .isArray()
    .withMessage("API permission IDs must be an array")
    .custom((value) => {
      if (
        !value.every(
          (id) => typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
        )
      ) {
        throw new Error(
          "All API permission IDs must be valid MongoDB ObjectIds"
        );
      }
      return true;
    }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { apiPermissionIds } = req.body;
      const roleId = req.params.id;

      // Verify role exists
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // Remove existing API permissions for this role
      await RoleApiPermission.deleteMany({ role_id: roleId });

      // Add new API permissions
      if (apiPermissionIds.length > 0) {
        const permissions = apiPermissionIds.map((permissionId) => ({
          role_id: roleId,
          api_permission_id: permissionId,
        }));

        await RoleApiPermission.insertMany(permissions);
      }

      res.json({
        success: true,
        message: "API permissions updated successfully",
      });
    } catch (error) {
      console.error("Error updating API permissions:", error);
      res.status(500).json({
        success: false,
        message: "Error updating API permissions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/roles/:id/permissions/page
 * @desc    Assign page permissions to role
 * @access  Private - requires roles:update permission
 */
router.post(
  "/:id/permissions/page",
  authenticate,
  requireApiPermission("roles:update"),
  idValidation,
  body("pagePermissionIds")
    .isArray()
    .withMessage("Page permission IDs must be an array")
    .custom((value) => {
      if (
        !value.every(
          (id) => typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
        )
      ) {
        throw new Error(
          "All page permission IDs must be valid MongoDB ObjectIds"
        );
      }
      return true;
    }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pagePermissionIds } = req.body;
      const roleId = req.params.id;

      // Verify role exists
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // Remove existing page permissions for this role
      await RolePagePermission.deleteMany({ role_id: roleId });

      // Add new page permissions
      if (pagePermissionIds.length > 0) {
        const permissions = pagePermissionIds.map((permissionId) => ({
          role_id: roleId,
          page_permission_id: permissionId,
        }));

        await RolePagePermission.insertMany(permissions);
      }

      res.json({
        success: true,
        message: "Page permissions updated successfully",
      });
    } catch (error) {
      console.error("Error updating page permissions:", error);
      res.status(500).json({
        success: false,
        message: "Error updating page permissions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/roles/:id/permissions/sidebar
 * @desc    Assign sidebar menu permissions to role
 * @access  Private - requires roles:update permission
 */
router.post(
  "/:id/permissions/sidebar",
  authenticate,
  requireApiPermission("roles:update"),
  idValidation,
  body("sidebarMenuIds")
    .isArray()
    .withMessage("Sidebar menu IDs must be an array")
    .custom((value) => {
      if (
        !value.every(
          (id) => typeof id === "string" && id.match(/^[0-9a-fA-F]{24}$/)
        )
      ) {
        throw new Error("All sidebar menu IDs must be valid MongoDB ObjectIds");
      }
      return true;
    }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { sidebarMenuIds } = req.body;
      const roleId = req.params.id;

      // Verify role exists
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      // Remove existing sidebar permissions for this role
      await RoleSidebarMenuItem.deleteMany({ role_id: roleId });

      // Add new sidebar permissions
      if (sidebarMenuIds.length > 0) {
        const permissions = sidebarMenuIds.map((menuId) => ({
          role_id: roleId,
          sidebar_menu_item_id: menuId,
        }));

        await RoleSidebarMenuItem.insertMany(permissions);
      }

      res.json({
        success: true,
        message: "Sidebar permissions updated successfully",
      });
    } catch (error) {
      console.error("Error updating sidebar permissions:", error);
      res.status(500).json({
        success: false,
        message: "Error updating sidebar permissions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
