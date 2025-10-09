/**
 * Permission Models
 * Pusti Happy Times - Permission Management Models
 *
 * This file contains models for managing different types of permissions:
 * 1. PagePermission - For page access control (pg_permissions)
 * 2. ApiPermission - For API endpoint access control (api_permissions)
 */

const mongoose = require("mongoose");

/**
 * Page Permission Schema
 * Database Collection: pg_permissions
 */
const pagePermissionSchema = new mongoose.Schema(
  {
    // Permission name (e.g., 'pg:dashboard', 'pg:users', 'pg:permissions')
    pg_permissions: {
      type: String,
      required: [true, "Permission name is required"],
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "pg_permissions",
  }
);

/**
 * API Permission Schema
 * Database Collection: api_permissions
 */
const apiPermissionSchema = new mongoose.Schema(
  {
    // Permission name (e.g., 'users:read', 'roles:create', 'permissions:manage')
    api_permissions: {
      type: String,
      required: [true, "API permission name is required"],
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "api_permissions",
  }
);

/**
 * Indexes
 */
pagePermissionSchema.index({ pg_permissions: 1 }, { unique: true });

apiPermissionSchema.index({ api_permissions: 1 }, { unique: true });

/**
 * Static Methods for PagePermission
 */
pagePermissionSchema.statics.getByName = async function (permissionName) {
  return await this.findOne({ pg_permissions: permissionName });
};



/**
 * Static Methods for ApiPermission
 */
apiPermissionSchema.statics.getByName = async function (permissionName) {
  return await this.findOne({ api_permissions: permissionName });
};



apiPermissionSchema.statics.getByEndpoint = async function (method, endpoint) {
  return await this.find({
    $or: [
      { method: method, endpoint: endpoint },
      { method: "*", endpoint: endpoint },
      { method: method, endpoint: "*" },
    ],
  });
};

/**
 * Export Models
 */
const PagePermission = mongoose.model("PagePermission", pagePermissionSchema);
const ApiPermission = mongoose.model("ApiPermission", apiPermissionSchema);

module.exports = {
  PagePermission,
  ApiPermission,
};
