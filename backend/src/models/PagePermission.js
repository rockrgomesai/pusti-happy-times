/**
 * Page Permission Model
 * Pusti Happy Times - Page Permission Management Schema
 *
 * This model defines the structure for page permissions used in
 * role-based access control for page access.
 *
 * Database Schema: pg_permissions [string, required, unique]
 */

const mongoose = require("mongoose");

/**
 * Page Permission Schema Definition
 * Matches the actual database schema
 */
const pagePermissionSchema = new mongoose.Schema(
  {
    // Page permission identifier (matches database schema)
    pg_permissions: {
      type: String,
      required: [true, "Page permission is required"],
      unique: true,
      trim: true,
    },
  },
  {
    // Schema options
    timestamps: false, // Database schema doesn't include timestamps
    versionKey: false, // Disable __v field
    collection: "pg_permissions", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */
// Unique index on pg_permissions field (automatically created due to unique: true)

/**
 * Static Methods
 */

/**
 * Get all page permissions
 * @returns {Array} Array of page permission documents
 */
pagePermissionSchema.statics.getAllPermissions = async function () {
  try {
    return await this.find({}).sort({ pg_permissions: 1 });
  } catch (error) {
    throw new Error(`Error fetching page permissions: ${error.message}`);
  }
};

/**
 * Find permission by name
 * @param {String} permissionName - The permission name to search for
 * @returns {Object|null} Permission document or null
 */
pagePermissionSchema.statics.findByName = async function (permissionName) {
  try {
    return await this.findOne({ pg_permissions: permissionName });
  } catch (error) {
    throw new Error(`Error finding page permission: ${error.message}`);
  }
};

/**
 * Check if permission exists
 * @param {String} permissionName - The permission name to validate
 * @returns {Boolean} True if permission exists, false otherwise
 */
pagePermissionSchema.statics.validatePermission = async function (
  permissionName
) {
  try {
    const permission = await this.findOne({ pg_permissions: permissionName });
    return !!permission;
  } catch (error) {
    return false;
  }
};

/**
 * Get page permissions for specific pages
 * @param {Array} pageNames - Array of page names to filter
 * @returns {Array} Array of permissions matching the pages
 */
pagePermissionSchema.statics.getForPages = async function (pageNames) {
  try {
    const permissions = pageNames.map((page) => `pg:${page}`);
    return await this.find({ pg_permissions: { $in: permissions } }).sort({
      pg_permissions: 1,
    });
  } catch (error) {
    throw new Error(`Error fetching page permissions: ${error.message}`);
  }
};

// Export the model
module.exports = mongoose.model("PagePermission", pagePermissionSchema);
