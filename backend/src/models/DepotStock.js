/**
 * DepotStock Model
 * Maintains ONLY current stock levels for each depot + product
 * Simple aggregated quantity only - all details are in transactions
 * One record per depot + product combination (NOT per batch)
 * Supports ACID transactions for concurrent updates
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const depotStockSchema = new Schema(
  {
    // Core depot identification
    depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: [true, "Depot ID is required"],
      index: true,
    },

    // Product details
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },

    // Current stock quantity (aggregated across ALL batches)
    qty_ctn: {
      type: Schema.Types.Decimal128,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },

    // Blocked/Reserved quantity for pending load sheets
    blocked_qty: {
      type: Schema.Types.Decimal128,
      default: 0,
      min: [0, "Blocked quantity cannot be negative"],
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
  },
  {
    collection: "depot_stocks",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  }
);

// CRITICAL: Unique compound index to ensure one record per depot+product
depotStockSchema.index(
  { depot_id: 1, product_id: 1 },
  { unique: true, name: "unique_depot_product" }
);

// Additional index for low stock queries
depotStockSchema.index({ depot_id: 1, qty_ctn: 1 });

// Virtual for quantity in pieces
depotStockSchema.virtual("qty_pcs").get(function () {
  if (this.populated("product_id") && this.product_id.ctn_pcs) {
    return parseFloat(this.qty_ctn) * this.product_id.ctn_pcs;
  }
  return 0;
});

// Virtual for available quantity (total - blocked)
depotStockSchema.virtual("available_qty").get(function () {
  return parseFloat(this.qty_ctn) - parseFloat(this.blocked_qty);
});

// Static method to get current stock for a product at a depot
depotStockSchema.statics.getCurrentStock = async function (depotId, productId) {
  return this.findOne({
    depot_id: depotId,
    product_id: productId,
  }).populate("product_id", "sku bangla_name english_name ctn_pcs");
};

// Static method to get low stock items (below threshold)
depotStockSchema.statics.getLowStock = async function (depotId, threshold = 10, limit = 50) {
  return this.find({
    depot_id: depotId,
    qty_ctn: { $lt: threshold, $gt: 0 },
  })
    .populate("product_id", "sku erp_id bangla_name english_name ctn_pcs")
    .sort({ qty_ctn: 1 })
    .limit(limit);
};

// Static method to get out of stock items
depotStockSchema.statics.getOutOfStock = async function (depotId, limit = 50) {
  return this.find({
    depot_id: depotId,
    qty_ctn: 0,
  })
    .populate("product_id", "sku erp_id bangla_name english_name ctn_pcs")
    .sort({ updated_at: -1 })
    .limit(limit);
};

// Static method to get stock summary
depotStockSchema.statics.getStockSummary = async function (depotId, filters = {}) {
  const matchStage = {
    depot_id: new mongoose.Types.ObjectId(depotId),
    ...filters,
  };

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "products",
        localField: "product_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "depot_transactions_in",
        let: { depot_id: "$depot_id", product_id: "$product_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$depot_id", "$$depot_id"] },
                  { $eq: ["$product_id", "$$product_id"] },
                  { $eq: ["$status", "approved"] },
                ],
              },
            },
          },
          {
            $group: {
              _id: { depot_id: "$depot_id", product_id: "$product_id" },
              batch_count: { $addToSet: "$batch_no" },
              earliest_expiry: { $min: "$expiry_date" },
              oldest_production: { $min: "$production_date" },
              total_qty_ctn: { $sum: { $toDouble: "$qty_ctn" } },
            },
          },
        ],
        as: "batch_info",
      },
    },
    {
      $project: {
        product_id: "$product_id",
        sku: "$product.sku",
        erp_id: "$product.erp_id",
        bangla_name: "$product.bangla_name",
        english_name: "$product.english_name",
        name: { $ifNull: ["$product.bangla_name", "$product.english_name"] },
        ctn_pcs: "$product.ctn_pcs",
        wt_pcs: "$product.wt_pcs",
        total_qty_ctn: { $toDouble: "$qty_ctn" },
        total_qty_pcs: { $multiply: [{ $toDouble: "$qty_ctn" }, "$product.ctn_pcs"] },
        total_wt_mt: {
          $divide: [
            { $multiply: [{ $toDouble: "$qty_ctn" }, "$product.ctn_pcs", "$product.wt_pcs"] },
            1000,
          ],
        },
        batch_count: {
          $cond: {
            if: { $gt: [{ $size: "$batch_info" }, 0] },
            then: { $size: { $arrayElemAt: ["$batch_info.batch_count", 0] } },
            else: 0,
          },
        },
        earliest_expiry_date: { $arrayElemAt: ["$batch_info.earliest_expiry", 0] },
        oldest_production_date: { $arrayElemAt: ["$batch_info.oldest_production", 0] },
      },
    },
    { $sort: { sku: 1 } },
  ]);

  return summary;
};

// Instance method to add stock (with session support for transactions)
depotStockSchema.methods.addStock = async function (qty, session = null) {
  const currentQty = parseFloat(this.qty_ctn);
  this.qty_ctn = currentQty + parseFloat(qty);

  if (session) {
    return this.save({ session });
  }
  return this.save();
};

// Instance method to deduct stock (with session support for transactions)
depotStockSchema.methods.deductStock = async function (qty, session = null) {
  const currentQty = parseFloat(this.qty_ctn);
  const qtyToDeduct = parseFloat(qty);

  if (currentQty < qtyToDeduct) {
    throw new Error(`Insufficient stock. Available: ${currentQty}, Requested: ${qtyToDeduct}`);
  }

  this.qty_ctn = currentQty - qtyToDeduct;

  if (session) {
    return this.save({ session });
  }
  return this.save();
};

const DepotStock = mongoose.model("DepotStock", depotStockSchema);

module.exports = DepotStock;
