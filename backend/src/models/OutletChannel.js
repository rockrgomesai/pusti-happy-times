const mongoose = require("mongoose");

const outletChannelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: String,
    },
    updated_by: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes
outletChannelSchema.index({ name: 1 });
outletChannelSchema.index({ active: 1 });

const OutletChannel = mongoose.model("OutletChannel", outletChannelSchema);

module.exports = OutletChannel;
