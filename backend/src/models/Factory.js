/**
 * Factory Model
 * Pusti Happy Times - Factory Management Schema
 *
 * This model defines the structure for factory information with audit fields.
 *
 * Database Schema: name [string, required, unique] + audit fields
 */

const mongoose = require("mongoose");

/**
 * Factory Schema Definition
 * Mirrors the brand schema structure to ensure consistency across master data.
 */
const factorySchema = new mongoose.Schema(
  {
    // Factory name - unique and required
    name: {
      type: String,
      required: [true, "Factory name is required"],
      unique: true,
      trim: true,
    },

    // Audit fields (manual to match existing collections)
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
    timestamps: false, // Manual audit fields for compatibility
    versionKey: false,
    collection: "factories",
  }
);

// Explicit unique index on name for clarity (in addition to unique: true)
factorySchema.index({ name: 1 }, { unique: true });

/**
 * Static Helpers
 */
factorySchema.statics.findByName = async function (factoryName) {
  try {
    return await this.findOne({ name: factoryName });
  } catch (error) {
    throw new Error(`Error finding factory: ${error.message}`);
  }
};

factorySchema.statics.getAllFactories = async function () {
  try {
    return await this.find({}).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching factories: ${error.message}`);
  }
};

/**
 * Middleware
 */
factorySchema.pre("save", function (next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

factorySchema.pre("findOneAndUpdate", function (next) {
  this.set({ updated_at: new Date() });
  next();
});

module.exports = mongoose.model("Factory", factorySchema);
