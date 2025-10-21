/**
 * Facility Model
 * Pusti Happy Times - Unified Facility Management Schema
 *
 * This model replaces the separate Depot and Factory models
 * with a unified Facility model that has a 'type' field.
 */

const mongoose = require("mongoose");

const FACILITY_TYPES = ["Factory", "Depot"];

/**
 * Facility Schema Definition
 */
const facilitySchema = new mongoose.Schema(
  {
    // Facility type - Factory or Depot
    type: {
      type: String,
      enum: FACILITY_TYPES,
      required: [true, "Facility type is required"],
      index: true,
    },

    // Facility name - unique and required
    name: {
      type: String,
      required: [true, "Facility name is required"],
      unique: true,
      trim: true,
    },

    // Legacy ID fields for backward compatibility
    depot_id: {
      type: String,
      trim: true,
      sparse: true,
    },

    factory_id: {
      type: String,
      trim: true,
      sparse: true,
    },

    // Location information
    location: {
      type: String,
      trim: true,
    },

    // Contact information
    contact_person: {
      type: String,
      trim: true,
    },

    contact_mobile: {
      type: String,
      trim: true,
    },

    // Active status
    active: {
      type: Boolean,
      default: true,
      index: true,
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
    collection: "facilities",
  }
);

// Indexes
facilitySchema.index({ name: 1 }, { unique: true });
facilitySchema.index({ type: 1, active: 1 });
facilitySchema.index({ depot_id: 1 }, { sparse: true });
facilitySchema.index({ factory_id: 1 }, { sparse: true });

/**
 * Static Helpers
 */
facilitySchema.statics.findByName = async function (facilityName) {
  try {
    return await this.findOne({ name: facilityName });
  } catch (error) {
    throw new Error(`Error finding facility: ${error.message}`);
  }
};

facilitySchema.statics.getAllFacilities = async function (type = null) {
  try {
    const query = type ? { type } : {};
    return await this.find(query).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching facilities: ${error.message}`);
  }
};

facilitySchema.statics.getDepots = async function () {
  try {
    return await this.find({ type: "Depot" }).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching depots: ${error.message}`);
  }
};

facilitySchema.statics.getFactories = async function () {
  try {
    return await this.find({ type: "Factory" }).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Error fetching factories: ${error.message}`);
  }
};

/**
 * Middleware
 */
facilitySchema.pre("save", function (next) {
  if (!this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

facilitySchema.pre("findOneAndUpdate", function (next) {
  this.set({ updated_at: new Date() });
  next();
});

// Export constants
facilitySchema.statics.FACILITY_TYPES = FACILITY_TYPES;

module.exports = mongoose.model("Facility", facilitySchema);
