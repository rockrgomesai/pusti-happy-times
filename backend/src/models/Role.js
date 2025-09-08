/**
 * Role Model
 * Pusti Happy Times - Role Management Schema
 *
 * This model defines the structure for user roles in the system,
 * supporting the three-tier permission system with proper validation.
 *
 * Roles: SuperAdmin, SalesAdmin, Distributor
 *
 * Database Schema: Only contains 'role' field as string, required, unique
 */

const mongoose = require("mongoose");

/**
 * Role Schema Definition
 * Matches the actual database schema: only role field
 */
const roleSchema = new mongoose.Schema(
  {
    // Role name - unique identifier (matches database schema)
    role: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (value) {
          // Only allow predefined roles
          const allowedRoles = ["SuperAdmin", "SalesAdmin", "Distributor"];
          return allowedRoles.includes(value);
        },
        message: "Role must be one of: SuperAdmin, SalesAdmin, Distributor",
      },
    },
  },
  {
    // Schema options
    timestamps: false, // Database schema doesn't include timestamps
    versionKey: false, // Disable __v field
    collection: "roles", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */
// Unique index on role field (automatically created due to unique: true)

/**
 * Model Methods
 */

/**
 * Find role by name
 * @param {String} roleName - The role name to search for
 * @returns {Object|null} Role document or null
 */
roleSchema.statics.findByName = async function (roleName) {
  try {
    return await this.findOne({ role: roleName });
  } catch (error) {
    throw new Error(`Error finding role: ${error.message}`);
  }
};

/**
 * Get all available roles
 * @returns {Array} Array of role documents
 */
roleSchema.statics.getAllRoles = async function () {
  try {
    return await this.find({}).sort({ role: 1 });
  } catch (error) {
    throw new Error(`Error fetching roles: ${error.message}`);
  }
};

/**
 * Validate if role exists
 * @param {String} roleName - The role name to validate
 * @returns {Boolean} True if role exists, false otherwise
 */
roleSchema.statics.validateRole = async function (roleName) {
  try {
    const role = await this.findOne({ role: roleName });
    return !!role;
  } catch (error) {
    return false;
  }
};

// Export the model
module.exports = mongoose.model("Role", roleSchema);
