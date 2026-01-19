const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * FIFO Batch Sub-Schema
 * Tracks individual stock batches with their prices for FIFO costing
 */
const FIFOBatchSchema = new Schema(
  {
    batch_id: {
      type: String,
      required: true,
      // Format: YYYYMMDD-HHMMSS-RANDOM
    },
    qty: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    unit_price: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    received_at: {
      type: Date,
      required: true,
      default: Date.now,
      index: true, // For FIFO ordering
    },
    chalan_id: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryChalan",
    },
    chalan_no: {
      type: String,
    },
  },
  {
    _id: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

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
      // Total quantity across all batches (for quick access)
    },
    batches: {
      type: [FIFOBatchSchema],
      default: [],
      // Ordered by received_at (oldest first) for FIFO
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

/**
 * Add stock using FIFO method
 * @param {Number} quantity - Quantity to add
 * @param {Number} unitPrice - Price per unit at the time of receipt
 * @param {ObjectId} chalanId - Reference to delivery chalan
 * @param {String} chalanNo - Chalan number for reference
 */
DistributorStockSchema.methods.addStockFIFO = function (quantity, unitPrice, chalanId, chalanNo) {
  const batch = {
    batch_id: `${new Date().toISOString().replace(/[-:T.Z]/g, "").substring(0, 14)}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`,
    qty: quantity,
    unit_price: unitPrice,
    received_at: new Date(),
    chalan_id: chalanId,
    chalan_no: chalanNo,
  };

  this.batches.push(batch);
  this.qty = parseFloat(this.qty) + quantity;
  this.last_received_at = new Date();
  this.last_chalan_id = chalanId;

  return batch;
};

/**
 * Reduce stock using FIFO method
 * @param {Number} quantityToReduce - Quantity to remove
 * @returns {Object} { success: Boolean, costOfGoodsSold: Number, batchesUsed: Array, message: String }
 */
DistributorStockSchema.methods.reduceStockFIFO = function (quantityToReduce) {
  let remainingToReduce = quantityToReduce;
  let costOfGoodsSold = 0;
  const batchesUsed = [];

  // Sort batches by received_at (FIFO - oldest first)
  this.batches.sort((a, b) => new Date(a.received_at) - new Date(b.received_at));

  let batchIndex = 0;
  while (remainingToReduce > 0 && batchIndex < this.batches.length) {
    const batch = this.batches[batchIndex];
    const batchQty = parseFloat(batch.qty);
    const batchPrice = parseFloat(batch.unit_price);

    if (batchQty > 0) {
      const qtyFromThisBatch = Math.min(batchQty, remainingToReduce);
      const costFromThisBatch = qtyFromThisBatch * batchPrice;

      batch.qty = batchQty - qtyFromThisBatch;
      remainingToReduce -= qtyFromThisBatch;
      costOfGoodsSold += costFromThisBatch;

      batchesUsed.push({
        batch_id: batch.batch_id,
        qty_used: qtyFromThisBatch,
        unit_price: batchPrice,
        cost: costFromThisBatch,
        received_at: batch.received_at,
      });
    }

    batchIndex++;
  }

  // Remove empty batches
  this.batches = this.batches.filter((b) => parseFloat(b.qty) > 0);

  // Update total quantity
  this.qty = parseFloat(this.qty) - (quantityToReduce - remainingToReduce);

  if (remainingToReduce > 0) {
    return {
      success: false,
      costOfGoodsSold: costOfGoodsSold,
      batchesUsed: batchesUsed,
      message: `Insufficient stock. Could not reduce ${remainingToReduce} units.`,
    };
  }

  return {
    success: true,
    costOfGoodsSold: costOfGoodsSold,
    batchesUsed: batchesUsed,
    message: "Stock reduced successfully using FIFO method.",
  };
};

/**
 * Get weighted average cost of current stock
 * @returns {Number} Weighted average unit price
 */
DistributorStockSchema.methods.getWeightedAverageCost = function () {
  if (!this.batches || this.batches.length === 0 || parseFloat(this.qty) === 0) {
    return 0;
  }

  let totalCost = 0;
  let totalQty = 0;

  this.batches.forEach((batch) => {
    const batchQty = parseFloat(batch.qty);
    const batchPrice = parseFloat(batch.unit_price);
    totalCost += batchQty * batchPrice;
    totalQty += batchQty;
  });

  return totalQty > 0 ? totalCost / totalQty : 0;
};

module.exports = mongoose.model("DistributorStock", DistributorStockSchema);
