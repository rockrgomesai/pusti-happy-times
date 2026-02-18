/**
 * Outlet Audit Model
 * Records inventory counts at outlets by SOs
 */

const mongoose = require("mongoose");

const outletAuditSchema = new mongoose.Schema(
  {
    // Unique identifier
    audit_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // References
    outlet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outlet",
      required: [true, "Outlet is required"],
      index: true,
    },
    so_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sales Officer is required"],
      index: true,
    },
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      index: true,
    },
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      index: true,
    },

    // Audit details
    audit_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Audited items
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        audited_qty_pcs: {
          type: Number,
          required: true,
          min: [0, "Quantity cannot be negative"],
        },
        previous_qty_pcs: {
          type: Number,
          default: 0,
        },
        variance: {
          type: Number,
          default: 0,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],

    // Summary
    total_items: {
      type: Number,
      required: true,
      min: 0,
    },
    total_qty_pcs: {
      type: Number,
      required: true,
      min: 0,
    },
    total_variance: {
      type: Number,
      default: 0,
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: {
        values: ["Draft", "Submitted", "Verified", "Approved"],
        message: "Invalid audit status",
      },
      default: "Submitted",
      index: true,
    },

    // Notes
    so_notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verified_at: {
      type: Date,
    },
    verification_notes: {
      type: String,
      trim: true,
    },

    // GPS location
    gps_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function (v) {
            return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
          },
          message: "Invalid GPS coordinates",
        },
      },
    },
    gps_accuracy: {
      type: Number,
    },

    // Previous audit reference
    previous_audit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutletAudit",
    },

    // Audit fields
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
outletAuditSchema.index({ audit_date: -1 });
outletAuditSchema.index({ outlet_id: 1, audit_date: -1 });
outletAuditSchema.index({ so_id: 1, audit_date: -1 });
outletAuditSchema.index({ status: 1, audit_date: -1 });
outletAuditSchema.index({ gps_location: "2dsphere" });

// Pre-save middleware: Auto-calculate totals and variance
outletAuditSchema.pre("save", function (next) {
  if (this.isModified("items")) {
    this.total_items = this.items.length;
    this.total_qty_pcs = this.items.reduce((sum, item) => sum + item.audited_qty_pcs, 0);
    this.total_variance = this.items.reduce((sum, item) => {
      item.variance = item.audited_qty_pcs - item.previous_qty_pcs;
      return sum + item.variance;
    }, 0);
  }
  next();
});

// Static method: Generate audit ID
outletAuditSchema.statics.generateAuditId = async function () {
  const prefix = "AUD";
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, "0");

  // Find latest audit for this month
  const latestAudit = await this.findOne({
    audit_id: { $regex: `^${prefix}${year}${month}` },
  })
    .sort({ audit_id: -1 })
    .select("audit_id");

  let sequence = 1;
  if (latestAudit) {
    const lastSequence = parseInt(latestAudit.audit_id.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${String(sequence).padStart(4, "0")}`;
};

// Static method: Get previous audit for outlet
outletAuditSchema.statics.getPreviousAudit = async function (outletId) {
  return this.findOne({
    outlet_id: outletId,
    status: { $in: ["Submitted", "Verified", "Approved"] },
  })
    .sort({ audit_date: -1 })
    .select("audit_id audit_date items")
    .populate("items.product_id", "sku english_name")
    .lean();
};

// Virtual: Days since audit
outletAuditSchema.virtual("days_since_audit").get(function () {
  const now = new Date();
  const diffMs = now - this.audit_date;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

const OutletAudit = mongoose.model("OutletAudit", outletAuditSchema);

module.exports = OutletAudit;
