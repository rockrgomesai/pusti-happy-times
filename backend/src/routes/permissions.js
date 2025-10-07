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
const mongoose = require("mongoose");
const { body, validationResult, param } = require("express-validator");
const { authenticate, requireApiPermission } = require("../middleware/auth");
const { PagePermission, ApiPermission } = require("../models/Permission");
const {
  RoleSidebarMenuItem,
  RolePagePermission,
  RoleApiPermission,
} = require("../models/JunctionTables");

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
 * @access  Private - requires permissions:read
 */
router.get(
  "/api",
  authenticate,
  requireApiPermission("permissions:read"),
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
 * @access  Private - requires permissions:read
 */
router.get(
  "/api/:id",
  authenticate,
  requireApiPermission("permissions:read"),
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
 * @access  Private - requires permissions:create
 */
router.post(
  "/api",
  authenticate,
  requireApiPermission("permissions:create"),
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
 * @access  Private - requires permissions:update
 */
router.put(
  "/api/:id",
  authenticate,
  requireApiPermission("permissions:update"),
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
 * @access  Private - requires permissions:delete
 */
router.delete(
  "/api/:id",
  authenticate,
  requireApiPermission("permissions:delete"),
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
 * @access  Private - requires permissions:read
 */
router.get(
  "/page",
  authenticate,
  requireApiPermission("permissions:read"),
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
 * @access  Private - requires permissions:read
 */
router.get(
  "/page/:id",
  authenticate,
  requireApiPermission("permissions:read"),
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
 * @access  Private - requires permissions:create
 */
router.post(
  "/page",
  authenticate,
  requireApiPermission("permissions:create"),
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
 * @access  Private - requires permissions:update
 */
router.put(
  "/page/:id",
  authenticate,
  requireApiPermission("permissions:update"),
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
 * @access  Private - requires permissions:delete
 */
router.delete(
  "/page/:id",
  authenticate,
  requireApiPermission("permissions:delete"),
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

/**
 * @route   GET /api/permissions/roles
 * @desc    Get all roles for permissions management
 * @access  Private - requires authentication
 */
router.get("/roles", authenticate, async (req, res) => {
  try {
    const Role = require("../models/Role");
    const roles = await Role.find().select("role").sort({ role: 1 });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching roles for permissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching roles",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/permissions/menu-items
 * @desc    Get all menu items with role assignments
 * @access  Private - requires authentication
 */
router.get("/menu-items", authenticate, async (req, res) => {
  try {
    const SidebarMenuItem = require("../models/SidebarMenuItem");
    const { roleId } = req.query;

    // Get all menu items first
    const allMenuItems = await SidebarMenuItem.find()
      .sort({ m_order: 1 })
      .lean();

    let assignedMenuItems = [];

    // If roleId is provided, get the actual assigned menu items using aggregation
    if (roleId) {
      const Role = require("../models/Role");

      const roleMenuItems = await Role.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(roleId) } },
        {
          $lookup: {
            from: "role_sidebar_menu_items",
            localField: "_id",
            foreignField: "role_id",
            as: "links",
          },
        },
        { $unwind: { path: "$links", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "sidebar_menu_items",
            localField: "links.sidebar_menu_item_id",
            foreignField: "_id",
            as: "menuDocs",
          },
        },
        { $unwind: { path: "$menuDocs", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$_id",
            role: { $first: "$role" },
            assignedMenuItemIds: { $addToSet: "$menuDocs._id" },
          },
        },
      ]);

      if (roleMenuItems.length > 0 && roleMenuItems[0].assignedMenuItemIds) {
        assignedMenuItems = roleMenuItems[0].assignedMenuItemIds
          .filter((id) => id !== null)
          .map((id) => id.toString());
      }
    }

    // Add assignment status to all menu items and clean up labels
    const menuItemsWithAssignments = allMenuItems.map((item) => ({
      _id: item._id,
      name: item.label, // Display clean label as 'name' for consistency with permissions
      href: item.href,
      m_order: item.m_order,
      icon: item.icon,
      parent_id: item.parent_id,
      is_submenu: item.is_submenu,
      assigned: assignedMenuItems.includes(item._id.toString()),
    }));

    res.json({
      success: true,
      data: menuItemsWithAssignments,
    });
  } catch (error) {
    console.error("Error fetching menu items for permissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching menu items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/permissions/page-permissions
 * @desc    Get all page permissions with role assignments
 * @access  Private - requires authentication
 */
router.get("/page-permissions", authenticate, async (req, res) => {
  try {
    const { roleId } = req.query;

    // Get all page permissions first
    const allPagePermissions = await PagePermission.find()
      .sort({ pg_permissions: 1 })
      .lean();

    let assignedPermissions = [];

    // If roleId is provided, get the actual assigned permissions using aggregation
    if (roleId) {
      const Role = require("../models/Role");

      const rolePermissions = await Role.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(roleId) } },
        {
          $lookup: {
            from: "role_pg_permissions",
            localField: "_id",
            foreignField: "role_id",
            as: "links",
          },
        },
        { $unwind: { path: "$links", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "pg_permissions",
            localField: "links.pg_permission_id",
            foreignField: "_id",
            as: "permDocs",
          },
        },
        { $unwind: { path: "$permDocs", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$_id",
            role: { $first: "$role" },
            assignedPermissionIds: { $addToSet: "$permDocs._id" },
          },
        },
      ]);

      if (
        rolePermissions.length > 0 &&
        rolePermissions[0].assignedPermissionIds
      ) {
        assignedPermissions = rolePermissions[0].assignedPermissionIds
          .filter((id) => id !== null)
          .map((id) => id.toString());
      }
    }

    // Add assignment status to all permissions
    const permissionsWithAssignments = allPagePermissions.map((perm) => ({
      ...perm,
      assigned: assignedPermissions.includes(perm._id.toString()),
    }));

    res.json({
      success: true,
      data: permissionsWithAssignments,
    });
  } catch (error) {
    console.error("Error fetching page permissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching page permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/permissions/api-permissions
 * @desc    Get all API permissions with role assignments
 * @access  Private - requires authentication
 */
router.get("/api-permissions", authenticate, async (req, res) => {
  try {
    const { roleId } = req.query;

    // Get all API permissions first
    const allApiPermissions = await ApiPermission.find()
      .sort({ api_permissions: 1 })
      .lean();

    let assignedPermissions = [];

    // If roleId is provided, get assigned permissions (distinct) from junction table
    if (roleId) {
      let roleObjectId = roleId;
      if (mongoose.Types.ObjectId.isValid(roleId)) {
        roleObjectId = new mongoose.Types.ObjectId(roleId);
      }
      const idList = await RoleApiPermission.distinct("api_permission_id", {
        role_id: roleObjectId,
      });
      assignedPermissions = idList
        .filter((id) => id)
        .map((id) => id.toString());
      console.log(
        "[api-permissions] roleId",
        roleId,
        "distinct assigned count",
        assignedPermissions.length
      );
    }

    // Add assignment status to all permissions
    const permissionsWithAssignments = allApiPermissions.map((perm) => ({
      ...perm,
      assigned: assignedPermissions.includes(perm._id.toString()),
    }));

    res.json({
      success: true,
      data: permissionsWithAssignments,
    });
  } catch (error) {
    console.error("Error fetching API permissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching API permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route GET /api/permissions/debug/api-permissions/:roleId
 * @desc  Debug raw junction mappings for a role (temporary)
 * @access Private (development aid)
 */
router.get("/debug/api-permissions/:roleId", authenticate, async (req, res) => {
  try {
    const { roleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid roleId" });
    }
    const docs = await RoleApiPermission.find({
      role_id: new mongoose.Types.ObjectId(roleId),
    })
      .select("role_id api_permission_id")
      .lean();
    return res.json({ success: true, count: docs.length, data: docs });
  } catch (e) {
    console.error("Debug fetch error", e);
    res.status(500).json({ success: false, message: "Debug error" });
  }
});

/**
 * @route   POST /api/permissions/assign-menus
 * @desc    Assign menu items to role
 * @access  Private - requires authentication
 */
router.post("/assign-menus", authenticate, async (req, res) => {
  try {
    const { RoleSidebarMenuItem } = require("../models/JunctionTables");
    const { roleId, menuItemIds } = req.body;

    if (!roleId || !Array.isArray(menuItemIds)) {
      return res.status(400).json({
        success: false,
        message: "Role ID and menu item IDs array are required",
      });
    }

    // Remove existing assignments for this role
    await RoleSidebarMenuItem.deleteMany({ role_id: roleId });

    // Create new assignments
    const assignments = menuItemIds.map((menuItemId) => ({
      role_id: roleId,
      sidebar_menu_item_id: menuItemId,
    }));

    if (assignments.length > 0) {
      await RoleSidebarMenuItem.insertMany(assignments);
    }

    res.json({
      success: true,
      message: `Successfully assigned ${assignments.length} menu items to role`,
    });
  } catch (error) {
    console.error("Error assigning menu items:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning menu items",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/permissions/assign-pages
 * @desc    Assign page permissions to role
 * @access  Private - requires authentication
 */
router.post("/assign-pages", authenticate, async (req, res) => {
  try {
    const { RolePagePermission } = require("../models/JunctionTables");
    const { roleId, permissionIds } = req.body;

    if (!roleId || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: "Role ID and permission IDs array are required",
      });
    }

    // Remove existing assignments for this role
    await RolePagePermission.deleteMany({ role_id: roleId });

    // Create new assignments
    const assignments = permissionIds.map((permissionId) => ({
      role_id: roleId,
      pg_permission_id: permissionId,
    }));

    if (assignments.length > 0) {
      await RolePagePermission.insertMany(assignments);
    }

    res.json({
      success: true,
      message: `Successfully assigned ${assignments.length} page permissions to role`,
    });
  } catch (error) {
    console.error("Error assigning page permissions:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning page permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/permissions/assign-apis
 * @desc    Assign API permissions to role
 * @access  Private - requires authentication
 */
router.post("/assign-apis", authenticate, async (req, res) => {
  try {
    const { RoleApiPermission } = require("../models/JunctionTables");
    const { roleId, permissionIds } = req.body;

    if (!roleId || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: "Role ID and permission IDs array are required",
      });
    }

    // Remove existing assignments for this role
    await RoleApiPermission.deleteMany({ role_id: roleId });

    // Create new assignments
    const assignments = permissionIds.map((permissionId) => ({
      role_id: roleId,
      api_permission_id: permissionId,
    }));

    if (assignments.length > 0) {
      await RoleApiPermission.insertMany(assignments);
    }

    res.json({
      success: true,
      message: `Successfully assigned ${assignments.length} API permissions to role`,
    });
  } catch (error) {
    console.error("Error assigning API permissions:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning API permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/permissions/assign-apis-upsert
 * @desc    Upsert API permissions to role (no deletes)
 * @access  Private - requires authentication
 */
router.post("/assign-apis-upsert", authenticate, async (req, res) => {
  try {
    const { RoleApiPermission } = require("../models/JunctionTables");
    const { roleId, permissionIds } = req.body;

    if (!roleId || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        success: false,
        message: "Role ID and permission IDs array are required",
      });
    }

    // Upsert each mapping; do not delete any existing assignments
    let upserts = 0;
    for (const permissionId of permissionIds) {
      const result = await RoleApiPermission.updateOne(
        { role_id: roleId, api_permission_id: permissionId },
        { $setOnInsert: { role_id: roleId, api_permission_id: permissionId } },
        { upsert: true }
      );
      // result.upsertedCount is not available on updateOne; infer via matchedCount
      if (result.matchedCount === 0) {
        upserts += 1;
      }
    }

    return res.json({
      success: true,
      message: `Upserted ${upserts} API permission(s) for role`,
      upserts,
      totalRequested: permissionIds.length,
    });
  } catch (error) {
    console.error("Error upserting API permissions:", error);
    res.status(500).json({
      success: false,
      message: "Error upserting API permissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
