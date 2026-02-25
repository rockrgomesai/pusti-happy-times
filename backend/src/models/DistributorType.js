/**
 * Distributor Type Model
 * Pusti Happy Times - Distributor Type Management Schema
 *
 * This model defines the structure for distributor type master data with audit fields.
 *
 * Database Schema: type_name [string, required, unique] + description + audit fields
 */

const mongoose = require("mongoose");

/**
 * Distributor Type Schema Definition
 */
const distributorTypeSchema = new mongoose.Schema(
  {
    // Type name - unique and required
    type_name: {
      type: String,
      required: [true, "Distributor type name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Type name must be at least 2 characters"],
      maxlength: [100, "Type name must not exceed 100 characters"],
    },

    // Description - optional
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must not exceed 500 characters"],
      default: "",
    },

    // Active status - default true
    active: {
      type: Boolean,
      default: true,
    },

    // Audit fields
    created_at: {
      type: Date,
      required: [true, "Created at is required"],
      default: Date.now,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Created by is required"],
      ref: "User",
    },

    updated_at: {
      type: Date,
      required: [true, "Updated at is required"],
      default: Date.now,
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Updated by is required"],
      ref: "User",
    },
  },
  {
    // Schema options
    timestamps: false, // Using manual audit fields
    versionKey: false, // Disable __v field
    collection: "distributor_types", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */
// Unique index on type_name field (automatically created due to unique: true)
distributorTypeSchema.index({ type_name: 1 });
distributorTypeSchema.index({ active: 1 });

/**
 * Model Methods
 */

/**
 * Find distributor type by name
 * @param {String} typeName - The type name to search for
 * @returns {Object|null} Distributor type document or null
 */
distributorTypeSchema.statics.findByName = async function (typeName) {
  try {
    return await this.findOne({ type_name: typeName });
  } catch (error) {
    throw new Error(`Error finding distributor type: ${error.message}`);
  }
};

/**
 * Get all active distributor types
 * @returns {Array} Array of active distributor types
 */
distributorTypeSchema.statics.getActiveTypes = async function () {
  try {
    return await this.find({ active: true }).sort({ type_name: 1 });
  } catch (error) {
    throw new Error(`Error fetching active distributor types: ${error.message}`);
  }
};

/**
 * Pre-save middleware - Update updated_at timestamp
 */
distributorTypeSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

/**
 * Pre-update middleware - Update updated_at timestamp
 */
distributorTypeSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updated_at: Date.now() });
  next();
});

// Create and export model
const DistributorType = mongoose.model("DistributorType", distributorTypeSchema);

module.exports = DistributorType;
