/**
 * Outlet Type Model
 * Defines outlet type/classification for retail outlets
 */

const mongoose = require("mongoose");

const outletTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Outlet type name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Outlet type name cannot exceed 100 characters"],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    created_by: {
      type: String,
      required: true,
      trim: true,
    },
    updated_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    updated_by: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: "outlet_types",
    versionKey: false,
  }
);

// Indexes
outletTypeSchema.index({ name: 1, active: 1 });
outletTypeSchema.index({ created_at: -1 });

// Pre-save middleware to update timestamps
outletTypeSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model("OutletType", outletTypeSchema);
