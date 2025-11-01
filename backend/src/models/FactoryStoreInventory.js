/**
 * FactoryStoreInventory Model
 *
 * Tracks current inventory levels at each Factory Store (Depot)
 * One record per product per factory store per batch
 * Running balance updated on each transaction
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const factoryStoreInventorySchema = new Schema(
  {
    facility_store_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    batch_no: {
      type: String,
      required: true,
      index: true,
    },
    production_date: {
      type: Date,
      required: true,
    },
    expiry_date: {
      type: Date,
      required: true,
      index: true, // For expiry alerts
    },
    // Current stock level in cartons
    qty_ctn: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    // Original received quantity (for reference)
    initial_qty_ctn: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    // Location within depot (rack/bin number)
    location: {
      type: String,
      default: "",
    },
    // Reference to original shipment from production
    source_shipment_ref: {
      type: String,
      required: true,
      index: true,
    },
    source_shipment_id: {
      type: Schema.Types.ObjectId,
      ref: "ProductionSendToStore",
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ["active", "depleted", "expired", "quarantine"],
      default: "active",
      index: true,
    },
    // Notes
    notes: {
      type: String,
      default: "",
    },
    // Audit fields
    received_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    received_at: {
      type: Date,
      default: Date.now,
    },
    last_updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    last_updated_at: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Compound indexes for common queries
factoryStoreInventorySchema.index(
  { facility_store_id: 1, product_id: 1, batch_no: 1 },
  { unique: true }
);
factoryStoreInventorySchema.index({ facility_store_id: 1, status: 1 });
factoryStoreInventorySchema.index({ product_id: 1, facility_store_id: 1, status: 1 });
factoryStoreInventorySchema.index({ expiry_date: 1, status: 1 }); // For expiry alerts

// Virtual for qty in pieces
factoryStoreInventorySchema.virtual("qty_pcs").get(function () {
  if (!this.populated("product_id")) return 0;
  return this.qty_ctn * (this.product_id.ctn_pcs || 0);
});

// Pre-save middleware to update status based on qty
factoryStoreInventorySchema.pre("save", function (next) {
  if (this.qty_ctn <= 0) {
    this.status = "depleted";
  }

  // Check if expired
  if (new Date() > this.expiry_date && this.status === "active") {
    this.status = "expired";
  }

  next();
});

// Static method to get current stock level
factoryStoreInventorySchema.statics.getCurrentStock = async function (facilityStoreId, productId) {
  const result = await this.aggregate([
    {
      $match: {
        facility_store_id: new mongoose.Types.ObjectId(facilityStoreId),
        product_id: new mongoose.Types.ObjectId(productId),
        status: "active",
      },
    },
    {
      $group: {
        _id: "$product_id",
        total_qty_ctn: { $sum: { $toDouble: "$qty_ctn" } },
      },
    },
  ]);

  return result.length > 0 ? result[0].total_qty_ctn : 0;
};

// Static method to get low stock products
factoryStoreInventorySchema.statics.getLowStock = async function (facilityStoreId, threshold = 10) {
  return await this.aggregate([
    {
      $match: {
        facility_store_id: new mongoose.Types.ObjectId(facilityStoreId),
        status: "active",
      },
    },
    {
      $group: {
        _id: "$product_id",
        total_qty_ctn: { $sum: { $toDouble: "$qty_ctn" } },
      },
    },
    {
      $match: {
        total_qty_ctn: { $lte: threshold },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $unwind: "$product",
    },
  ]);
};

// Static method to get expiring soon products
factoryStoreInventorySchema.statics.getExpiringSoon = async function (
  facilityStoreId,
  daysThreshold = 30
) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysThreshold);

  return await this.find({
    facility_store_id: facilityStoreId,
    status: "active",
    expiry_date: { $lte: expiryDate, $gte: new Date() },
  })
    .populate("product_id", "sku name erp_id")
    .sort({ expiry_date: 1 });
};

const FactoryStoreInventory = mongoose.model("FactoryStoreInventory", factoryStoreInventorySchema);

module.exports = FactoryStoreInventory;
