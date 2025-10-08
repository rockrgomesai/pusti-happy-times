/**
 * Depot Model
 * Pusti Happy Times - Depot Management Schema
 *
 * Structure matches the Factory model to keep master data consistent.
 */

const mongoose = require("mongoose");

/**
 * Depot Schema Definition
 */
const depotSchema = new mongoose.Schema(
  {
    // Depot name - unique and required
    name: {
      type: String,
  required: [true, "Depot name is required"],
      unique: true,
      trim: true,
    },

    // Audit fields (manual for compatibility with legacy collections)
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
    timestamps: false,
    versionKey: false,
    collection: "depots",
  }
);

// Ensure name uniqueness at the database level
depotSchema.index({ name: 1 }, { unique: true });

/**
 * Static Helpers
 */
depotSchema.statics.findByName = async function (depotName) {
  try {
    return await this.findOne({ name: depotName });
  } catch (error) {
    throw new Error(`Error finding depot: ${error.message}`);
  }
};

depotSchema.statics.getAllDepots = async function () {
  try {
    return await this.find({}).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching depots: ${error.message}`);
  }
};

/**
 * Middleware
 */
depotSchema.pre("save", function (next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

depotSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updated_at: new Date() });
  next();
});

module.exports = mongoose.model("Depot", depotSchema);
