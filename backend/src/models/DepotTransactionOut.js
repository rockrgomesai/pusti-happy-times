/**
 * DepotTransactionOut Model
 * Handles all outgoing transactions from depots (including factory stores)
 * Destinations: distributors, other depots, returns to production, adjustments
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const depotTransactionOutSchema = new Schema(
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

    // Batch tracking
    batch_no: {
      type: String,
      required: [true, "Batch number is required"],
      trim: true,
      index: true,
    },
    production_date: {
      type: Date,
      required: [true, "Production date is required"],
    },
    expiry_date: {
      type: Date,
      required: [true, "Expiry date is required"],
      index: true,
    },

    // Transaction details
    transaction_type: {
      type: String,
      enum: [
        "to_distributor", // Sale/delivery to distributor
        "transfer_out", // Transfer to another depot
        "return_to_production", // Return to factory
        "adjustment_out", // Negative adjustments (damage, expiry, etc.)
        "waste", // Damaged/expired goods
      ],
      required: [true, "Transaction type is required"],
      index: true,
    },

    // Quantity
    qty_ctn: {
      type: Schema.Types.Decimal128,
      required: [true, "Quantity in cartons is required"],
      min: [0.01, "Quantity must be greater than 0"],
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },

    // Reference to source document
    reference_type: {
      type: String,
      enum: [
        "DemandOrder",
        "DepotTransferIn",
        "ProductionReturn",
        "StockAdjustment",
        "WasteRecord",
      ],
    },
    reference_id: {
      type: Schema.Types.ObjectId,
      refPath: "reference_type",
      index: true,
    },
    reference_no: {
      type: String,
      trim: true,
      index: true,
    },

    // Destination location
    destination_depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
    },
    destination_distributor_id: {
      type: Schema.Types.ObjectId,
      ref: "Distributor",
    },

    // Storage location within depot (where it was taken from)
    location: {
      type: String,
      default: "",
      trim: true,
    },

    // Transaction metadata
    transaction_date: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    dispatched_date: {
      type: Date,
      default: Date.now,
    },
    delivery_date: {
      type: Date,
    },

    // Balance tracking (stock level after this transaction)
    balance_after_qty_ctn: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "dispatched", "delivered", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },

    // Delivery tracking
    vehicle_no: {
      type: String,
      default: "",
      trim: true,
    },
    driver_name: {
      type: String,
      default: "",
      trim: true,
    },
    driver_contact: {
      type: String,
      default: "",
      trim: true,
    },

    // Reason for adjustment/waste
    reason: {
      type: String,
      default: "",
      trim: true,
    },

    // Notes and remarks
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },

    // User tracking
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approved_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approved_at: {
      type: Date,
    },
    dispatched_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    deleted_at: {
      type: Date,
    },
  },
  {
    collection: "depot_transactions_out",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  }
);

// Compound indexes for common queries
depotTransactionOutSchema.index({ depot_id: 1, transaction_date: -1 });
depotTransactionOutSchema.index({ depot_id: 1, product_id: 1, batch_no: 1 });
depotTransactionOutSchema.index({ depot_id: 1, transaction_type: 1, status: 1 });
depotTransactionOutSchema.index({ reference_type: 1, reference_id: 1 });
depotTransactionOutSchema.index({ destination_distributor_id: 1, status: 1 });

// Virtual for quantity in pieces
depotTransactionOutSchema.virtual("qty_pcs").get(function () {
  if (this.product_id && this.product_id.ctn_pcs) {
    return parseFloat(this.qty_ctn) * this.product_id.ctn_pcs;
  }
  return 0;
});

// Pre-save validation
depotTransactionOutSchema.pre("save", function (next) {
  // Validate expiry date is after production date
  if (this.production_date && this.expiry_date) {
    if (this.expiry_date <= this.production_date) {
      return next(new Error("Expiry date must be after production date"));
    }
  }

  // Ensure dispatched_date is set
  if (!this.dispatched_date) {
    this.dispatched_date = this.transaction_date || new Date();
  }

  // If status is dispatched, ensure dispatched_date is set
  if (this.status === "dispatched" && !this.dispatched_date) {
    this.dispatched_date = new Date();
  }

  // If status is delivered, ensure delivery_date is set
  if (this.status === "delivered" && !this.delivery_date) {
    this.delivery_date = new Date();
  }

  next();
});

// Static method to get transaction history with filters
depotTransactionOutSchema.statics.getHistory = async function (
  depotId,
  filters = {},
  page = 1,
  limit = 50
) {
  const query = {
    depot_id: depotId,
    is_deleted: false,
    ...filters,
  };

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    this.find(query)
      .populate("product_id", "sku erp_id bangla_name english_name ctn_pcs wt_pcs")
      .populate("depot_id", "name type")
      .populate("destination_depot_id", "name type")
      .populate("destination_distributor_id", "name contact")
      .populate("created_by", "username")
      .populate("approved_by", "username")
      .populate("dispatched_by", "username")
      .sort({ transaction_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
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
depotTransactionOutSchema.statics.getDailySummary = async function (depotId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const summary = await this.aggregate([
    {
      $match: {
        depot_id: new mongoose.Types.ObjectId(depotId),
        transaction_date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ["approved", "dispatched", "delivered"] },
        is_deleted: false,
      },
    },
    {
      $group: {
        _id: "$transaction_type",
        total_qty_ctn: { $sum: { $toDouble: "$qty_ctn" } },
        transaction_count: { $sum: 1 },
      },
    },
  ]);

  return summary;
};

// Static method to get pending dispatches
depotTransactionOutSchema.statics.getPendingDispatches = async function (depotId, limit = 20) {
  return this.find({
    depot_id: depotId,
    status: { $in: ["pending", "approved"] },
    is_deleted: false,
  })
    .populate("product_id", "sku bangla_name english_name")
    .populate("destination_depot_id", "name")
    .populate("destination_distributor_id", "name")
    .populate("created_by", "username")
    .sort({ created_at: -1 })
    .limit(limit);
};

const DepotTransactionOut = mongoose.model("DepotTransactionOut", depotTransactionOutSchema);

module.exports = DepotTransactionOut;
