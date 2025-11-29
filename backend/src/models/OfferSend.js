/**
 * OfferSend Model
 * Tracks PROCURED products sent from Sales Admin to multiple depots
 * Similar to ProductionSendToStore but for offer/procured products
 */

const mongoose = require("mongoose");

const offerSendProductSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  // Quantity in pieces (PROCURED products always use PCS)
  qty_pcs: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v) => (v ? parseFloat(v.toString()) : 0),
    validate: {
      validator: function (v) {
        const value = parseFloat(v.toString());
        return value > 0;
      },
      message: "Quantity must be greater than 0",
    },
  },
  // Price (user-editable)
  price: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v) => (v ? parseFloat(v.toString()) : 0),
    validate: {
      validator: function (v) {
        const value = parseFloat(v.toString());
        return value > 0;
      },
      message: "Price must be greater than 0",
    },
  },
  batch_no: {
    type: String,
    required: false,
    index: true,
    trim: true,
  },
  production_date: {
    type: Date,
    required: false,
    index: true,
  },
  expiry_date: {
    type: Date,
    required: false,
  },
  note: {
    type: String,
    default: "",
    trim: true,
  },
});

const offerSendSchema = new mongoose.Schema(
  {
    ref_no: {
      type: String,
      unique: true,
      required: false, // Auto-generated in pre-save hook
      index: true,
    },
    // Multiple depot IDs (Sales Admin sends to multiple depots)
    depot_ids: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Facility",
        },
      ],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one depot is required",
      },
      index: true,
    },
    send_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    products: {
      type: [offerSendProductSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one product is required",
      },
    },
    // Status tracking per depot (array of depot status)
    depot_status: {
      type: [
        {
          depot_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Facility",
            required: true,
          },
          status: {
            type: String,
            enum: ["pending", "received", "partially_received"],
            default: "pending",
          },
          received_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          received_at: {
            type: Date,
          },
          note: {
            type: String,
            default: "",
            trim: true,
          },
        },
      ],
      default: [],
    },
    // Overall status
    status: {
      type: String,
      enum: ["pending", "partially_received", "fully_received", "cancelled"],
      default: "pending",
      index: true,
    },
    // Notes and remarks
    general_note: {
      type: String,
      default: "",
      trim: true,
    },
    // User tracking
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cancelled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelled_at: {
      type: Date,
    },
    cancellation_reason: {
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
    collection: "offer_sends",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  }
);

// Indexes for common queries
offerSendSchema.index({ depot_ids: 1, status: 1, send_date: -1 });
offerSendSchema.index({ created_by: 1, send_date: -1 });
offerSendSchema.index({ "depot_status.depot_id": 1, "depot_status.status": 1 });

// Virtual for total quantity
offerSendSchema.virtual("total_qty_pcs").get(function () {
  if (!this.products || this.products.length === 0) return 0;
  return this.products.reduce((sum, p) => sum + parseFloat(p.qty_pcs), 0);
});

// Virtual for total weight in MT
offerSendSchema.virtual("total_wt_mt").get(function () {
  if (!this.products || this.products.length === 0) return 0;
  return (
    this.products.reduce((sum, p) => {
      const qty = parseFloat(p.qty_pcs);
      const wt = p.product_id?.wt_pcs || 0;
      return sum + qty * wt;
    }, 0) / 1000
  ); // Convert grams to MT
});

// Pre-save hook: Auto-generate reference number
offerSendSchema.pre("save", async function (next) {
  if (!this.ref_no && this.isNew) {
    try {
      // Format: OFFSEND-YYYYMMDD-XXX
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

      // Find the latest ref_no for today
      const latestDoc = await this.constructor
        .findOne({
          ref_no: new RegExp(`^OFFSEND-${dateStr}-`),
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

      this.ref_no = `OFFSEND-${dateStr}-${String(sequence).padStart(3, "0")}`;
    } catch (error) {
      return next(error);
    }
  }

  // Initialize depot_status array if not set
  if (this.isNew && (!this.depot_status || this.depot_status.length === 0)) {
    this.depot_status = this.depot_ids.map((depot_id) => ({
      depot_id,
      status: "pending",
    }));
  }

  next();
});

// Pre-validate hook: Verify all products are PROCURED type
offerSendSchema.pre("validate", async function (next) {
  if (this.products && this.products.length > 0) {
    try {
      const Product = mongoose.model("Product");
      const productIds = this.products.map((p) => p.product_id);

      const products = await Product.find({
        _id: { $in: productIds },
      }).select("_id product_type");

      const nonProcured = products.filter((p) => p.product_type !== "PROCURED");

      if (nonProcured.length > 0) {
        const error = new Error("Only PROCURED products can be sent as offer items");
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
  }

  // Validate expiry date is after production date
  if (this.products) {
    for (const product of this.products) {
      if (product.production_date && product.expiry_date) {
        if (product.expiry_date <= product.production_date) {
          return next(new Error("Expiry date must be after production date"));
        }
      }
    }
  }

  next();
});

// Static method to get sends for a specific depot
offerSendSchema.statics.getForDepot = async function (depotId, filters = {}, page = 1, limit = 50) {
  const query = {
    depot_ids: depotId,
    is_deleted: false,
    ...filters,
  };

  const skip = (page - 1) * limit;

  const [sends, total] = await Promise.all([
    this.find(query)
      .populate("depot_ids", "name type")
      .populate("products.product_id", "sku trade_price wt_pcs")
      .populate("created_by", "username")
      .sort({ send_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    sends,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static method to get pending sends for a depot
offerSendSchema.statics.getPendingForDepot = async function (depotId) {
  return this.find({
    depot_ids: depotId,
    "depot_status.depot_id": depotId,
    "depot_status.status": "pending",
    is_deleted: false,
  })
    .populate("depot_ids", "name type")
    .populate("products.product_id", "sku")
    .populate("created_by", "username")
    .sort({ send_date: -1 })
    .lean();
};

// Instance method to update depot status
offerSendSchema.methods.updateDepotStatus = async function (depotId, status, userId, note = "") {
  const depotStatusIndex = this.depot_status.findIndex(
    (ds) => ds.depot_id.toString() === depotId.toString()
  );

  if (depotStatusIndex === -1) {
    throw new Error("Depot not found in this send");
  }

  this.depot_status[depotStatusIndex].status = status;
  this.depot_status[depotStatusIndex].received_by = userId;
  this.depot_status[depotStatusIndex].received_at = new Date();
  if (note) {
    this.depot_status[depotStatusIndex].note = note;
  }

  // Update overall status
  const allReceived = this.depot_status.every((ds) => ds.status === "received");
  const someReceived = this.depot_status.some((ds) => ds.status === "received");

  if (allReceived) {
    this.status = "fully_received";
  } else if (someReceived) {
    this.status = "partially_received";
  }

  return this.save();
};

const OfferSend = mongoose.model("OfferSend", offerSendSchema);

module.exports = OfferSend;
