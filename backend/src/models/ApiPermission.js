/**
 * API Permission Model
 * Pusti Happy Times - API Permission Management Schema
 *
 * This model defines the structure for API permissions used in
 * role-based access control for API endpoints.
 *
 * Database Schema: api_permissions [string, required, unique]
 */

const mongoose = require("mongoose");

/**
 * API Permission Schema Definition
 * Matches the actual database schema
 */
const apiPermissionSchema = new mongoose.Schema(
  {
    // API permission identifier (matches database schema)
    api_permissions: {
      type: String,
      required: [true, "API permission is required"],
      unique: true,
      trim: true,
    },
  },
  {
    // Schema options
    timestamps: false, // Database schema doesn't include timestamps
    versionKey: false, // Disable __v field
    collection: "api_permissions", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */
// Unique index on api_permissions field (automatically created due to unique: true)

/**
 * Static Methods
 */

/**
 * Get all API permissions
 * @returns {Array} Array of API permission documents
 */
apiPermissionSchema.statics.getAllPermissions = async function () {
  try {
    return await this.find({}).sort({ api_permissions: 1 });
  } catch (error) {
    throw new Error(`Error fetching API permissions: ${error.message}`);
  }
};

/**
 * Find permission by name
 * @param {String} permissionName - The permission name to search for
 * @returns {Object|null} Permission document or null
 */
apiPermissionSchema.statics.findByName = async function (permissionName) {
  try {
    return await this.findOne({ api_permissions: permissionName });
  } catch (error) {
    throw new Error(`Error finding API permission: ${error.message}`);
  }
};

/**
 * Check if permission exists
 * @param {String} permissionName - The permission name to validate
 * @returns {Boolean} True if permission exists, false otherwise
 */
apiPermissionSchema.statics.validatePermission = async function (
  permissionName
) {
  try {
    const permission = await this.findOne({ api_permissions: permissionName });
    return !!permission;
  } catch (error) {
    return false;
  }
};

/**
 * Get permissions by category (auth, create, read, update, delete)
 * @param {String} category - Permission category prefix
 * @returns {Array} Array of permissions matching the category
 */
apiPermissionSchema.statics.getByCategory = async function (category) {
  try {
    const regex = new RegExp(`^${category}:`, "i");
    return await this.find({ api_permissions: regex }).sort({
      api_permissions: 1,
    });
  } catch (error) {
    throw new Error(`Error fetching permissions by category: ${error.message}`);
  }
};

// Export the model
module.exports = mongoose.model("ApiPermission", apiPermissionSchema);
