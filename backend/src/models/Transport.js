/**
 * Transport Model
 * Pusti Happy Times - Transport Management Schema
 *
 * This model defines the structure for transport information with audit fields.
 *
 * Database Schema: transport [string, required, unique] + audit fields
 */

const mongoose = require("mongoose");

/**
 * Transport Schema Definition
 * Matches the actual database schema: transport field + audit fields
 */
const transportSchema = new mongoose.Schema(
  {
    // Transport name - unique and required (matches database schema)
    transport: {
      type: String,
      required: [true, "Transport name is required"],
      unique: true,
      trim: true,
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
    collection: "transports", // Explicit collection name
  }
);

/**
 * Indexes for Performance Optimization
 */
// Unique index on transport field (automatically created due to unique: true)

/**
 * Model Methods
 */

/**
 * Find transport by name
 * @param {String} transportName - The transport name to search for
 * @returns {Object|null} Transport document or null
 */
transportSchema.statics.findByName = async function (transportName) {
  try {
    return await this.findOne({ transport: transportName });
  } catch (error) {
    throw new Error(`Error finding transport: ${error.message}`);
  }
};

/**
 * Get all transports
 * @returns {Array} Array of transport documents
 */
transportSchema.statics.getAllTransports = async function () {
  try {
    return await this.find({}).sort({ transport: 1 });
  } catch (error) {
    throw new Error(`Error fetching transports: ${error.message}`);
  }
};

/**
 * Update audit fields on save
 */
transportSchema.pre("save", function (next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

// Export the model
module.exports = mongoose.model("Transport", transportSchema);