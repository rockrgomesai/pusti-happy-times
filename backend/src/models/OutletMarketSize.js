const mongoose = require("mongoose");

const outletMarketSizeSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    mkt_size: {
      type: Number,
      required: true,
      min: 0,
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
outletMarketSizeSchema.index({ category: 1 });
outletMarketSizeSchema.index({ mkt_size: 1 });
outletMarketSizeSchema.index({ active: 1 });

// Compound unique index to prevent duplicate category entries
outletMarketSizeSchema.index({ category: 1, active: 1 }, { unique: true });

const OutletMarketSize = mongoose.model("OutletMarketSize", outletMarketSizeSchema);

module.exports = OutletMarketSize;
