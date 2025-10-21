/**
 * Brand Model
 * Pusti Happy Times - Brand Management Schema
 *
 * This model defines the structure for brand information with audit fields.
 *
 * Database Schema: brand [string, required, unique] + audit fields
 */

const mongoose = require("mongoose");

/**
 * Brand Schema Definition
 * Matches the actual database schema: brand field + audit fields
 */
const brandSchema = new mongoose.Schema(
  {
    // Brand name - unique and required (matches database schema)
    brand: {
      type: String,
      required: [true, "Brand name is required"],
      unique: true,
      trim: true,
    },

    // Active status - default true
    active: {
      type: Boolean,
      default: true,
    },

    // Audit fields (matches database schema)
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
    collection: "brands", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */
// Unique index on brand field (automatically created due to unique: true)

/**
 * Model Methods
 */

/**
 * Find brand by name
 * @param {String} brandName - The brand name to search for
 * @returns {Object|null} Brand document or null
 */
brandSchema.statics.findByName = async function (brandName) {
  try {
    return await this.findOne({ brand: brandName });
  } catch (error) {
    throw new Error(`Error finding brand: ${error.message}`);
  }
};

/**
 * Get all brands
 * @returns {Array} Array of brand documents
 */
brandSchema.statics.getAllBrands = async function () {
  try {
    return await this.find({}).sort({ brand: 1 });
  } catch (error) {
    throw new Error(`Error fetching brands: ${error.message}`);
  }
};

/**
 * Update audit fields on save
 */
brandSchema.pre("save", function (next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

// Export the model
module.exports = mongoose.model("Brand", brandSchema);
