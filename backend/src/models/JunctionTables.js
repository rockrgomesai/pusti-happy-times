/**
 * Junction Table Models
 * Pusti Happy Times - Many-to-Many Relationship Models
 *
 * This file contains junction table models for managing many-to-many
 * relationships in the permission system:
 *
 * 1. RoleSidebarMenuItem - Links roles to sidebar menu items
 * 2. RoleApiPermission - Links roles to API permissions
 * 3. RolePagePermission - Links roles to page permissions
 *
 * Database Schema matches: role_id (ObjectId), permission_id (ObjectId)
 */

const mongoose = require("mongoose");

/**
 * Role Sidebar Menu Items Junction Table
 * Links roles to sidebar menu items for navigation access control
 * Database Collection: role_sidebar_menu_items
 */
const roleSidebarMenuItemSchema = new mongoose.Schema(
  {
    // Role reference (matches database schema)
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: [true, "Role ID is required"],
    },

    // Sidebar menu item reference (matches database schema)
    sidebar_menu_item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SidebarMenuItem",
      required: [true, "Sidebar menu item ID is required"],
    },
  },
  {
    // Schema options
    timestamps: false, // Database schema doesn't include timestamps
    versionKey: false, // Disable __v field
    collection: "role_sidebar_menu_items", // Explicit collection name
  }
);

/**
 * Role API Permissions Junction Table
 * Links roles to API permissions for endpoint access control
 * Database Collection: roles_api_permissions
 */
const roleApiPermissionSchema = new mongoose.Schema(
  {
    // Role reference (matches database schema)
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: [true, "Role ID is required"],
    },

    // API permission reference (matches database schema)
    api_permission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiPermission",
      required: [true, "API permission ID is required"],
    },
  },
  {
    // Schema options
    timestamps: false, // Database schema doesn't include timestamps
    versionKey: false, // Disable __v field
    collection: "role_api_permissions", // Explicit collection name (matches actual DB collection)
  }
);

/**
 * Role Page Permissions Junction Table
 * Links roles to page permissions for page access control
 * Database Collection: role_pg_permissions
 */
const rolePagePermissionSchema = new mongoose.Schema(
  {
    // Role reference (matches database schema)
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: [true, "Role ID is required"],
    },

    // Page permission reference (matches database schema)
    pg_permission_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PagePermission",
      required: [true, "Page permission ID is required"],
    },
  },
  {
    // Schema options
    timestamps: false, // Database schema doesn't include timestamps
    versionKey: false, // Disable __v field
    collection: "role_pg_permissions", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */

// Role Sidebar Menu Items indexes
roleSidebarMenuItemSchema.index({ role_id: 1 });
roleSidebarMenuItemSchema.index({ sidebar_menu_item_id: 1 });
roleSidebarMenuItemSchema.index({ role_id: 1, sidebar_menu_item_id: 1 }, { unique: true });

// Role API Permissions indexes
roleApiPermissionSchema.index({ role_id: 1 });
roleApiPermissionSchema.index({ api_permission_id: 1 });
roleApiPermissionSchema.index({ role_id: 1, api_permission_id: 1 }, { unique: true });

// Role Page Permissions indexes
rolePagePermissionSchema.index({ role_id: 1 });
rolePagePermissionSchema.index({ pg_permission_id: 1 });
rolePagePermissionSchema.index({ role_id: 1, pg_permission_id: 1 }, { unique: true });

/**
 * Static Methods for RoleSidebarMenuItem
 */

/**
 * Get sidebar menu items for a specific role
 * @param {String} roleId - Role ID
 * @returns {Array} Array of sidebar menu items for the role
 */
roleSidebarMenuItemSchema.statics.getMenuItemsForRole = async function (roleId) {
  try {
    return await this.find({ role_id: roleId })
      .populate("sidebar_menu_item_id")
      .sort({ "sidebar_menu_item_id.m_order": 1 });
  } catch (error) {
    throw new Error(`Error fetching menu items for role: ${error.message}`);
  }
};

/**
 * Check if role has access to specific menu item
 * @param {String} roleId - Role ID
 * @param {String} menuItemId - Menu item ID
 * @returns {Boolean} True if role has access, false otherwise
 */
roleSidebarMenuItemSchema.statics.hasMenuAccess = async function (roleId, menuItemId) {
  try {
    const access = await this.findOne({ role_id: roleId, sidebar_menu_item_id: menuItemId });
    return !!access;
  } catch (error) {
    return false;
  }
};

/**
 * Static Methods for RoleApiPermission
 */

/**
 * Get API permissions for a specific role
 * @param {String} roleId - Role ID
 * @returns {Array} Array of API permissions for the role
 */
roleApiPermissionSchema.statics.getPermissionsForRole = async function (roleId) {
  try {
    return await this.find({ role_id: roleId }).populate("api_permission_id");
  } catch (error) {
    throw new Error(`Error fetching API permissions for role: ${error.message}`);
  }
};

/**
 * Check if role has specific API permission
 * @param {String} roleId - Role ID
 * @param {String} permissionName - Permission name (e.g., 'auth:login')
 * @returns {Boolean} True if role has permission, false otherwise
 */
roleApiPermissionSchema.statics.hasApiPermission = async function (roleId, permissionName) {
  try {
    const ApiPermission = mongoose.model("ApiPermission");
    const permission = await ApiPermission.findOne({ api_permissions: permissionName });
    if (!permission) return false;

    const access = await this.findOne({ role_id: roleId, api_permission_id: permission._id });
    return !!access;
  } catch (error) {
    return false;
  }
};

/**
 * Static Methods for RolePagePermission
 */

/**
 * Get page permissions for a specific role
 * @param {String} roleId - Role ID
 * @returns {Array} Array of page permissions for the role
 */
rolePagePermissionSchema.statics.getPermissionsForRole = async function (roleId) {
  try {
    return await this.find({ role_id: roleId }).populate("pg_permission_id");
  } catch (error) {
    throw new Error(`Error fetching page permissions for role: ${error.message}`);
  }
};

/**
 * Check if role has specific page permission
 * @param {String} roleId - Role ID
 * @param {String} permissionName - Permission name (e.g., 'pg:dashboard')
 * @returns {Boolean} True if role has permission, false otherwise
 */
rolePagePermissionSchema.statics.hasPagePermission = async function (roleId, permissionName) {
  try {
    const PagePermission = mongoose.model("PagePermission");
    const permission = await PagePermission.findOne({ pg_permissions: permissionName });
    if (!permission) return false;

    const access = await this.findOne({ role_id: roleId, pg_permission_id: permission._id });
    return !!access;
  } catch (error) {
    return false;
  }
};

/**
 * Export Models
 */
const RoleSidebarMenuItem = mongoose.model("RoleSidebarMenuItem", roleSidebarMenuItemSchema);
const RoleApiPermission = mongoose.model("RoleApiPermission", roleApiPermissionSchema);
const RolePagePermission = mongoose.model("RolePagePermission", rolePagePermissionSchema);

module.exports = {
  RoleSidebarMenuItem,
  RoleApiPermission,
  RolePagePermission,
};
