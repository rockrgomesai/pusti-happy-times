/**
 * OfferReceive Model
 * Tracks received PROCURED products at depot level
 * Links to OfferSend and creates depot_transactions_in records
 */

const mongoose = require("mongoose");

const offerReceiveProductSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  // Quantity received in pieces
  qty_pcs_received: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v) => (v ? parseFloat(v.toString()) : 0),
    validate: {
      validator: function (v) {
        const value = parseFloat(v.toString());
        return value > 0;
      },
      message: "Received quantity must be greater than 0",
    },
  },
  // Original sent quantity for reference
  qty_pcs_sent: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v) => (v ? parseFloat(v.toString()) : 0),
  },
  batch_no: {
    type: String,
    required: false,
    trim: true,
  },
  production_date: {
    type: Date,
    required: false,
  },
  expiry_date: {
    type: Date,
    required: false,
  },
  // Variance tracking
  variance_qty_pcs: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    get: (v) => (v ? parseFloat(v.toString()) : 0),
  },
  variance_reason: {
    type: String,
    enum: ["", "damage", "shortage", "excess", "other"],
    default: "",
  },
  note: {
    type: String,
    default: "",
    trim: true,
  },
});

const offerReceiveSchema = new mongoose.Schema(
  {
    ref_no: {
      type: String,
      unique: true,
      required: false, // Auto-generated in pre-save hook
      index: true,
    },
    // Reference to OfferSend
    offer_send_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfferSend",
      required: true,
      index: true,
    },
    offer_send_ref_no: {
      type: String,
      required: true,
      index: true,
    },
    // Receiving depot
    depot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    receive_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    // Products received
    products: {
      type: [offerReceiveProductSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one product is required",
      },
    },
    // Overall variance summary
    has_variance: {
      type: Boolean,
      default: false,
    },
    variance_note: {
      type: String,
      default: "",
      trim: true,
    },
    // Quality check
    quality_check_status: {
      type: String,
      enum: ["pending", "passed", "failed", "not_required"],
      default: "passed",
    },
    quality_notes: {
      type: String,
      default: "",
      trim: true,
    },
    // Status
    status: {
      type: String,
      enum: ["received", "approved", "rejected"],
      default: "received",
      index: true,
    },
    // User tracking
    received_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approved_at: {
      type: Date,
    },
    // Stock update tracking (links to depot_transactions_in)
    depot_transaction_ids: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DepotTransactionIn",
        },
      ],
      default: [],
    },
    stock_updated: {
      type: Boolean,
      default: false,
      index: true,
    },
    stock_updated_at: {
      type: Date,
    },
    // Notes and remarks
    general_note: {
      type: String,
      default: "",
      trim: true,
    },
    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deleted_at: {
      type: Date,
    },
  },
  {
    collection: "offer_receives",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  }
);

// Indexes for common queries
offerReceiveSchema.index({ depot_id: 1, receive_date: -1 });
offerReceiveSchema.index({ offer_send_id: 1, depot_id: 1 });
offerReceiveSchema.index({ received_by: 1, receive_date: -1 });
offerReceiveSchema.index({ stock_updated: 1, status: 1 });

// Virtual for total received quantity
offerReceiveSchema.virtual("total_qty_pcs_received").get(function () {
  if (!this.products || this.products.length === 0) return 0;
  return this.products.reduce((sum, p) => sum + parseFloat(p.qty_pcs_received), 0);
});

// Virtual for total sent quantity
offerReceiveSchema.virtual("total_qty_pcs_sent").get(function () {
  if (!this.products || this.products.length === 0) return 0;
  return this.products.reduce((sum, p) => sum + parseFloat(p.qty_pcs_sent), 0);
});

// Virtual for total variance
offerReceiveSchema.virtual("total_variance_qty_pcs").get(function () {
  if (!this.products || this.products.length === 0) return 0;
  return this.products.reduce((sum, p) => sum + parseFloat(p.variance_qty_pcs), 0);
});

// Virtual for total weight in MT
offerReceiveSchema.virtual("total_wt_mt_received").get(function () {
  if (!this.products || this.products.length === 0) return 0;
  return (
    this.products.reduce((sum, p) => {
      const qty = parseFloat(p.qty_pcs_received);
      const wt = p.product_id?.wt_pcs || 0;
      return sum + qty * wt;
    }, 0) / 1000
  ); // Convert grams to MT
});

// Pre-save hook: Auto-generate reference number
offerReceiveSchema.pre("save", async function (next) {
  if (!this.ref_no && this.isNew) {
    try {
      // Format: OFFRECV-YYYYMMDD-XXX
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

      // Find the latest ref_no for today
      const latestDoc = await this.constructor
        .findOne({
          ref_no: new RegExp(`^OFFRECV-${dateStr}-`),
        })
        .sort({ ref_no: -1 })
        .select("ref_no");

      let sequence = 1;
      if (latestDoc && latestDoc.ref_no) {
        const parts = latestDoc.ref_no.split("-");
        if (parts.length === 3) {
          sequence = parseInt(parts[2], 10) + 1;
        }
      }

      this.ref_no = `OFFRECV-${dateStr}-${String(sequence).padStart(3, "0")}`;
    } catch (error) {
      return next(error);
    }
  }

  // Calculate variance and set has_variance flag
  if (this.products && this.products.length > 0) {
    let hasVariance = false;
    this.products.forEach((product) => {
      const sent = parseFloat(product.qty_pcs_sent);
      const received = parseFloat(product.qty_pcs_received);
      product.variance_qty_pcs = received - sent;

      if (Math.abs(received - sent) > 0.01) {
        hasVariance = true;
      }
    });
    this.has_variance = hasVariance;
  }

  next();
});

// Static method to get receive history for a depot
offerReceiveSchema.statics.getHistory = async function (
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

  const [receives, total] = await Promise.all([
    this.find(query)
      .populate("depot_id", "name type")
      .populate("offer_send_id", "ref_no send_date")
      .populate("products.product_id", "sku")
      .populate("received_by", "username")
      .populate("approved_by", "username")
      .sort({ receive_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    receives,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to check if offer send already received by depot
offerReceiveSchema.statics.isAlreadyReceived = async function (offerSendId, depotId) {
  const existing = await this.findOne({
    offer_send_id: offerSendId,
    depot_id: depotId,
    is_deleted: false,
  });
  return !!existing;
};

// Instance method to update depot stock (UPSERT logic)
offerReceiveSchema.methods.updateDepotStock = async function () {
  const DepotStock = mongoose.model("DepotStock");
  const DepotTransactionIn = mongoose.model("DepotTransactionIn");

  const transactionIds = [];

  for (const product of this.products) {
    const qty_pcs = parseFloat(product.qty_pcs_received);

    // UPSERT depot stock: Find existing or create new
    let stockRecord = await DepotStock.findOne({
      depot_id: this.depot_id,
      product_id: product.product_id,
    });

    const currentQty = stockRecord ? parseFloat(stockRecord.qty_ctn) : 0;
    const newQty = currentQty + qty_pcs; // For PROCURED, qty_ctn stores pieces

    if (stockRecord) {
      stockRecord.qty_ctn = newQty;
      await stockRecord.save();
    } else {
      stockRecord = new DepotStock({
        depot_id: this.depot_id,
        product_id: product.product_id,
        qty_ctn: qty_pcs, // Store pieces in qty_ctn for PROCURED
      });
      await stockRecord.save();
    }

    // Create depot_transactions_in record
    const transactionIn = new DepotTransactionIn({
      depot_id: this.depot_id,
      product_id: product.product_id,
      batch_no: product.batch_no,
      production_date: product.production_date,
      expiry_date: product.expiry_date,
      transaction_type: "from_offer_send",
      qty_ctn: qty_pcs, // Store pieces in qty_ctn for PROCURED
      reference_type: "OfferReceive",
      reference_id: this._id,
      reference_no: this.ref_no,
      transaction_date: this.receive_date,
      received_date: this.receive_date,
      balance_after_qty_ctn: newQty,
      status: "approved",
      quality_check_status: this.quality_check_status || "not_required",
      quality_notes: this.quality_notes || "",
      notes: product.note || this.general_note || "",
      created_by: this.received_by,
    });

    await transactionIn.save();
    transactionIds.push(transactionIn._id);
  }

  // Update receive record with transaction IDs and stock update flag
  this.depot_transaction_ids = transactionIds;
  this.stock_updated = true;
  this.stock_updated_at = new Date();

  return this.save();
};

const OfferReceive = mongoose.model("OfferReceive", offerReceiveSchema);

module.exports = OfferReceive;
