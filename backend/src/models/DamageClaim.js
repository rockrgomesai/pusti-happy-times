/**
 * Damage Claim Model
 * Records damaged/expired product claims made by SOs during outlet visits
 */

const mongoose = require("mongoose");

const damageClaimSchema = new mongoose.Schema(
  {
    // Unique identifier
    claim_id: {
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
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: [true, "Distributor is required"],
      index: true,
    },
    so_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sales Officer is required"],
      index: true,
    },
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      index: true,
    },

    // Claim details
    claim_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Claimed items
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        qty_claimed_pcs: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        damage_reason: {
          type: String,
          required: true,
          enum: {
            values: [
              "physical_damage",
              "expired",
              "defective",
              "near_expiry",
              "wrong_product",
              "packaging_damage",
              "quality_issue",
            ],
            message: "Invalid damage reason",
          },
        },
        notes: {
          type: String,
          trim: true,
          maxlength: [500, "Notes cannot exceed 500 characters"],
        },
        batch_number: {
          type: String,
          trim: true,
        },
        estimated_value_bdt: {
          type: Number,
          min: 0,
        },
      },
    ],

    // Summary
    total_items: {
      type: Number,
      required: true,
      min: 1,
    },
    total_qty_pcs: {
      type: Number,
      required: true,
      min: 1,
    },
    total_value_bdt: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Claim status workflow
    status: {
      type: String,
      required: true,
      enum: {
        values: [
          "Pending",
          "Under Review",
          "Verified",
          "Approved",
          "Rejected",
          "Replaced",
          "Closed",
        ],
        message: "Invalid claim status",
      },
      default: "Pending",
      index: true,
    },
    status_history: [
      {
        status: String,
        changed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changed_at: {
          type: Date,
          default: Date.now,
        },
        comments: String,
      },
    ],

    // Verification & approval
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
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approved_at: {
      type: Date,
    },
    approval_notes: {
      type: String,
      trim: true,
    },
    rejected_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejected_at: {
      type: Date,
    },
    rejection_reason: {
      type: String,
      trim: true,
    },

    // Resolution
    resolution_type: {
      type: String,
      enum: ["replacement", "refund", "credit_note", "rejected", "none"],
    },
    replacement_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecondaryOrder",
    },
    credit_note_id: {
      type: String,
    },
    refund_amount_bdt: {
      type: Number,
      min: 0,
    },
    resolved_at: {
      type: Date,
    },
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      type: Number, // meters
    },

    // Attachments (photos, documents)
    attachments: [
      {
        type: String, // URL or path
      },
    ],

    // Additional notes
    so_notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    admin_notes: {
      type: String,
      trim: true,
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
damageClaimSchema.index({ claim_date: -1 });
damageClaimSchema.index({ outlet_id: 1, claim_date: -1 });
damageClaimSchema.index({ distributor_id: 1, status: 1 });
damageClaimSchema.index({ so_id: 1, claim_date: -1 });
damageClaimSchema.index({ status: 1, claim_date: -1 });
damageClaimSchema.index({ gps_location: "2dsphere" });

// Pre-save middleware: Auto-calculate totals
damageClaimSchema.pre("save", function (next) {
  if (this.isModified("items")) {
    this.total_items = this.items.length;
    this.total_qty_pcs = this.items.reduce((sum, item) => sum + item.qty_claimed_pcs, 0);
    this.total_value_bdt = this.items.reduce(
      (sum, item) => sum + (item.estimated_value_bdt || 0),
      0
    );
  }
  next();
});

// Static method: Generate claim ID
damageClaimSchema.statics.generateClaimId = async function () {
  const prefix = "DC";
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, "0");

  // Find latest claim for this month
  const latestClaim = await this.findOne({
    claim_id: { $regex: `^${prefix}${year}${month}` },
  })
    .sort({ claim_id: -1 })
    .select("claim_id");

  let sequence = 1;
  if (latestClaim) {
    const lastSequence = parseInt(latestClaim.claim_id.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${String(sequence).padStart(4, "0")}`;
};

// Instance method: Update status
damageClaimSchema.methods.updateStatus = function (newStatus, userId, comments) {
  this.status = newStatus;
  this.status_history.push({
    status: newStatus,
    changed_by: userId,
    changed_at: new Date(),
    comments: comments || "",
  });
};

// Instance method: Mark as verified
damageClaimSchema.methods.markAsVerified = function (userId, notes) {
  this.status = "Verified";
  this.verified_by = userId;
  this.verified_at = new Date();
  this.verification_notes = notes;
  this.status_history.push({
    status: "Verified",
    changed_by: userId,
    changed_at: new Date(),
    comments: notes,
  });
};

// Instance method: Approve claim
damageClaimSchema.methods.approve = function (userId, notes) {
  this.status = "Approved";
  this.approved_by = userId;
  this.approved_at = new Date();
  this.approval_notes = notes;
  this.status_history.push({
    status: "Approved",
    changed_by: userId,
    changed_at: new Date(),
    comments: notes,
  });
};

// Instance method: Reject claim
damageClaimSchema.methods.reject = function (userId, reason) {
  this.status = "Rejected";
  this.rejected_by = userId;
  this.rejected_at = new Date();
  this.rejection_reason = reason;
  this.status_history.push({
    status: "Rejected",
    changed_by: userId,
    changed_at: new Date(),
    comments: reason,
  });
};

// Virtual: Days since claim
damageClaimSchema.virtual("days_since_claim").get(function () {
  const now = new Date();
  const diffMs = now - this.claim_date;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

const DamageClaim = mongoose.model("DamageClaim", damageClaimSchema);

module.exports = DamageClaim;
