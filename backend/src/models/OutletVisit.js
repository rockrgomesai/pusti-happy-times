/**
 * Outlet Visit Model
 * Records SO visits to outlets (shop closed, no sales, visit only)
 */

const mongoose = require("mongoose");

const outletVisitSchema = new mongoose.Schema(
  {
    // Unique identifier
    visit_id: {
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
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
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

    // Visit details
    visit_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    check_in_time: {
      type: Date,
      required: true,
      default: Date.now,
    },
    check_out_time: {
      type: Date,
    },
    duration_minutes: {
      type: Number,
      min: 0,
    },

    // Visit type
    visit_type: {
      type: String,
      required: true,
      enum: {
        values: ["shop_closed", "no_sales", "audit", "sales", "damage_claim", "visit_only"],
        message: "Invalid visit type",
      },
      index: true,
    },

    // Shop status
    shop_status: {
      type: String,
      enum: ["Open", "Closed", "Temporarily Closed"],
    },
    shop_closed_reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },

    // No sales reason
    no_sales_reason: {
      type: String,
      enum: {
        values: [
          "previous_order_not_delivered",
          "payment_issues",
          "overstocked",
          "credit_limit_reached",
          "outlet_requested_delay",
          "price_concerns",
          "competitor_issues",
          "other",
        ],
        message: "Invalid no sales reason",
      },
    },
    no_sales_notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },

    // Related records
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecondaryOrder",
    },
    audit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutletAudit",
    },
    claim_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DamageClaim",
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
    distance_from_outlet: {
      type: Number, // meters
    },

    // Notes
    so_notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    admin_notes: {
      type: String,
      trim: true,
    },

    // Visit outcome
    productive: {
      type: Boolean,
      default: false,
    },
    order_value: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Audit fields
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
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
outletVisitSchema.index({ visit_date: -1 });
outletVisitSchema.index({ outlet_id: 1, visit_date: -1 });
outletVisitSchema.index({ so_id: 1, visit_date: -1 });
outletVisitSchema.index({ visit_type: 1, visit_date: -1 });
outletVisitSchema.index({ gps_location: "2dsphere" });

// Pre-save middleware: Calculate check-out duration
outletVisitSchema.pre("save", function (next) {
  if (this.check_out_time && this.check_in_time) {
    const durationMs = this.check_out_time.getTime() - this.check_in_time.getTime();
    this.duration_minutes = Math.round(durationMs / (1000 * 60));
  }
  next();
});

// Static method: Generate visit ID
outletVisitSchema.statics.generateVisitId = async function () {
  const prefix = "VIS";
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  // Find latest visit for this day
  const latestVisit = await this.findOne({
    visit_id: { $regex: `^${prefix}${year}${month}${day}` },
  })
    .sort({ visit_id: -1 })
    .select("visit_id");

  let sequence = 1;
  if (latestVisit) {
    const lastSequence = parseInt(latestVisit.visit_id.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${day}${String(sequence).padStart(4, "0")}`;
};

// Virtual: Visit duration in hours
outletVisitSchema.virtual("duration_hours").get(function () {
  if (!this.duration_minutes) return 0;
  return (this.duration_minutes / 60).toFixed(2);
});

// Virtual: Is visit today
outletVisitSchema.virtual("is_today").get(function () {
  const today = new Date();
  return (
    this.visit_date.getDate() === today.getDate() &&
    this.visit_date.getMonth() === today.getMonth() &&
    this.visit_date.getFullYear() === today.getFullYear()
  );
});

const OutletVisit = mongoose.model("OutletVisit", outletVisitSchema);

module.exports = OutletVisit;
