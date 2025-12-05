const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DistributorStockSchema = new Schema(
  {
    distributor_id: {
      type: Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    qty: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    last_received_at: {
      type: Date,
    },
    last_chalan_id: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryChalan",
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Compound index for unique distributor + SKU combination
DistributorStockSchema.index({ distributor_id: 1, sku: 1 }, { unique: true });

// Index for faster queries
DistributorStockSchema.index({ distributor_id: 1, qty: -1 });

module.exports = mongoose.model("DistributorStock", DistributorStockSchema);
