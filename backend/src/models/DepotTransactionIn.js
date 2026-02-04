/**
 * DepotTransactionIn Model
 * Handles all incoming transactions to depots (including factory stores)
 * Sources: production, transfers from other depots, returns, adjustments
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const depotTransactionInSchema = new Schema(
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
      required: false,
      trim: true,
      index: true,
    },
    production_date: {
      type: Date,
      required: false,
    },
    expiry_date: {
      type: Date,
      required: false,
      index: true,
    },

    // Transaction details
    transaction_type: {
      type: String,
      enum: [
        "from_production", // From factory production
        "from_offer_send", // From Sales Admin offer send
        "transfer_in", // From another depot
        "return_in", // Returns from distributors/customers
        "adjustment_in", // Positive adjustments
        "initial_stock", // Initial stock entry
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
        "ProductionSendToStore",
        "OfferReceive",
        "DepotTransferOut",
        "DistributorReturn",
        "StockAdjustment",
        "InitialStock",
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

    // Source location (for transfers)
    source_depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
    },
    source_facility_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
    },

    // Storage location within depot
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
    received_date: {
      type: Date,
      default: Date.now,
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
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "approved",
      index: true,
    },

    // Quality check
    quality_check_status: {
      type: String,
      enum: ["pending", "passed", "failed", "not_required"],
      default: "not_required",
    },
    quality_notes: {
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
    collection: "depot_transactions_in",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  }
);

// Compound indexes for common queries
depotTransactionInSchema.index({ depot_id: 1, transaction_date: -1 });
depotTransactionInSchema.index({ depot_id: 1, product_id: 1, batch_no: 1 });
depotTransactionInSchema.index({ depot_id: 1, transaction_type: 1, status: 1 });
depotTransactionInSchema.index({ reference_type: 1, reference_id: 1 });

// Virtual for quantity in pieces
depotTransactionInSchema.virtual("qty_pcs").get(function () {
  if (this.product_id && this.product_id.ctn_pcs) {
    return parseFloat(this.qty_ctn) * this.product_id.ctn_pcs;
  }
  return 0;
});

// Pre-save validation
depotTransactionInSchema.pre("save", function (next) {
  // Validate expiry date is after production date
  if (this.production_date && this.expiry_date) {
    if (this.expiry_date <= this.production_date) {
      return next(new Error("Expiry date must be after production date"));
    }
  }

  // Ensure received_date is set
  if (!this.received_date) {
    this.received_date = this.transaction_date || new Date();
  }

  next();
});

// Static method to get transaction history with filters
depotTransactionInSchema.statics.getHistory = async function (
  depotId,
  filters = {},
  page = 1,
  limit = 0
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
      .populate("source_depot_id", "name type")
      .populate("source_facility_id", "name type")
      .populate("created_by", "username")
      .populate("approved_by", "username")
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
depotTransactionInSchema.statics.getDailySummary = async function (depotId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const summary = await this.aggregate([
    {
      $match: {
        depot_id: new mongoose.Types.ObjectId(depotId),
        transaction_date: { $gte: startOfDay, $lte: endOfDay },
        status: "approved",
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

// Static method to get pending transactions
depotTransactionInSchema.statics.getPending = async function (depotId, limit = 20) {
  return this.find({
    depot_id: depotId,
    status: "pending",
    is_deleted: false,
  })
    .populate("product_id", "sku bangla_name english_name")
    .populate("created_by", "username")
    .sort({ created_at: -1 })
    .limit(limit);
};

const DepotTransactionIn = mongoose.model("DepotTransactionIn", depotTransactionInSchema);

module.exports = DepotTransactionIn;
