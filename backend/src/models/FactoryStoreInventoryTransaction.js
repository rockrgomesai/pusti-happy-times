/**
 * FactoryStoreInventoryTransaction Model
 *
 * Logs all inventory movements at Factory Store (Depot)
 * Tracks receipts, transfers, adjustments, damages, etc.
 * Provides complete audit trail
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const factoryStoreInventoryTransactionSchema = new Schema(
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
    // Transaction type
    transaction_type: {
      type: String,
      enum: [
        "receipt", // Receiving from production
        "transfer_out", // Sending to other depots/distributors
        "adjustment_in", // Manual increase (correction)
        "adjustment_out", // Manual decrease (correction)
        "damage", // Damaged goods
        "expired", // Expired goods removal
        "return", // Return from depot/distributor
      ],
      required: true,
      index: true,
    },
    // Quantity (positive for IN, negative for OUT)
    qty_ctn: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    // Balance after transaction
    balance_after: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    // Reference documents
    reference_type: {
      type: String,
      enum: ["production_shipment", "depot_transfer", "manual_adjustment", "damage_report"],
    },
    reference_id: {
      type: Schema.Types.ObjectId,
      refPath: "reference_type_model",
    },
    reference_type_model: {
      type: String,
      enum: ["ProductionSendToStore", "DepotTransfer", "InventoryAdjustment", "DamageReport"],
    },
    reference_no: {
      type: String,
      index: true,
    },
    // Related facility (for transfers)
    related_facility_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
    },
    // Transaction details
    production_date: {
      type: Date,
    },
    expiry_date: {
      type: Date,
    },
    location: {
      type: String,
      default: "",
    },
    // Reason/Notes
    reason: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    // Audit fields
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Approval (for adjustments)
    approved_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approved_at: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Auto-approved for receipts/transfers
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Compound indexes for common queries
factoryStoreInventoryTransactionSchema.index({ facility_store_id: 1, created_at: -1 });
factoryStoreInventoryTransactionSchema.index({
  product_id: 1,
  facility_store_id: 1,
  created_at: -1,
});
factoryStoreInventoryTransactionSchema.index({ batch_no: 1, facility_store_id: 1 });
factoryStoreInventoryTransactionSchema.index({ transaction_type: 1, created_at: -1 });
factoryStoreInventoryTransactionSchema.index({ reference_no: 1 });

// Virtual for formatted transaction type
factoryStoreInventoryTransactionSchema.virtual("formatted_type").get(function () {
  const typeMap = {
    receipt: "Receipt from Production",
    transfer_out: "Transfer Out",
    adjustment_in: "Adjustment (+)",
    adjustment_out: "Adjustment (-)",
    damage: "Damage",
    expired: "Expired",
    return: "Return",
  };
  return typeMap[this.transaction_type] || this.transaction_type;
});

// Static method to get transaction history
factoryStoreInventoryTransactionSchema.statics.getHistory = async function (
  facilityStoreId,
  filters = {},
  page = 1,
  limit = 0
) {
  const query = { facility_store_id: facilityStoreId, ...filters };

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    this.find(query)
      .populate("product_id", "sku name erp_id")
      .populate("created_by", "username")
      .populate("approved_by", "username")
      .populate("related_facility_id", "name")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query),
  ]);

  return {
    transactions,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to get daily summary
factoryStoreInventoryTransactionSchema.statics.getDailySummary = async function (
  facilityStoreId,
  date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await this.aggregate([
    {
      $match: {
        facility_store_id: new mongoose.Types.ObjectId(facilityStoreId),
        created_at: { $gte: startOfDay, $lte: endOfDay },
      },
    },
    {
      $group: {
        _id: "$transaction_type",
        count: { $sum: 1 },
        total_qty: { $sum: { $toDouble: "$qty_ctn" } },
      },
    },
  ]);
};

const FactoryStoreInventoryTransaction = mongoose.model(
  "FactoryStoreInventoryTransaction",
  factoryStoreInventoryTransactionSchema
);

module.exports = FactoryStoreInventoryTransaction;
