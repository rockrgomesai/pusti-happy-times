const mongoose = require("mongoose");

const demandOrderItemSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ["product", "offer"],
    required: true,
  },
  source_id: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "items.source_ref",
    required: true,
  },
  source_ref: {
    type: String,
    enum: ["Product", "Offer"],
    required: true,
  },
  sku: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  unit_price: {
    type: Number,
    required: true,
    min: [0, "Unit price cannot be negative"],
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, "Subtotal cannot be negative"],
  },
  // Store product details at time of order
  product_details: {
    short_description: String,
    category: String,
    brand: String,
    unit_per_case: Number,
  },
  // For offer-based items
  offer_details: {
    offer_id: mongoose.Schema.Types.ObjectId,
    offer_name: String,
    offer_code: String,
    offer_type: String, // BOGO, BUNDLE_OFFER, FLAT_DISCOUNT_PCT, etc.
    discount_percentage: Number,
    discount_amount: Number,
    original_subtotal: Number,
    // Bundle-specific details
    is_bundle_item: Boolean,
    bundle_id: String, // Group items belonging to same bundle
    qty_per_bundle: Number, // How many units of this SKU per bundle
    is_free_in_bundle: Boolean, // Is this a free item in the bundle?
  },

  // Distribution scheduling fields - Progressive Tracking
  // For bundle offers: track bundles; for simple offers: track quantities
  is_bundle_offer: {
    type: Boolean,
    default: false,
  },

  // Bundle-based tracking (for BOGO, BUNDLE_OFFER, etc.)
  bundle_definition: {
    bundle_size: Number, // Total items per bundle
    items: [
      {
        sku: String,
        qty_per_bundle: Number,
        is_free: Boolean,
        unit_price: Number,
      },
    ],
  },

  order_bundles: {
    type: Number,
    default: 0,
    min: [0, "Order bundles cannot be negative"],
  },
  scheduled_bundles: {
    type: Number,
    default: 0,
    min: [0, "Scheduled bundles cannot be negative"],
  },
  unscheduled_bundles: {
    type: Number,
    default: function () {
      return this.order_bundles || 0;
    },
  },

  // Quantity-based tracking (for simple discount offers, tiered discounts)
  scheduled_qty: {
    type: Number,
    default: 0,
    min: [0, "Scheduled quantity cannot be negative"],
  },
  unscheduled_qty: {
    type: Number,
    default: function () {
      return this.quantity || 0;
    },
  },

  // Pricing locked at order time (for tiered discounts)
  discount_locked: {
    type: Boolean,
    default: true,
  },
  original_price: Number,
  discount_applied_percent: Number,
  discount_applied_amount: Number,

  // Threshold-based offer tracking (free gift on purchase)
  threshold_met: Boolean,
  threshold_amount: Number,

  // Offer breaking tracking
  is_offer_broken: {
    type: Boolean,
    default: false,
  },
  break_info: {
    broken_at: Date,
    broken_by: mongoose.Schema.Types.ObjectId,
    reason: String,
    price_adjustment_required: Boolean,
    original_price: Number,
    adjusted_price: Number,
  },

  // Progressive scheduling records
  schedules: [
    {
      schedule_id: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString(),
      },
      // For bundle offers: user inputs bundles, qty is auto-calculated
      deliver_bundles: Number,
      deliver_qty: {
        type: Number,
        required: true,
        min: [1, "Deliver quantity must be at least 1"],
      },
      // For multi-product bundles: breakdown per SKU
      deliver_qty_breakdown: {
        type: Map,
        of: Number, // { "P1": 20, "P2": 30, "Umb": 10 }
      },
      facility_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Facility",
        required: true,
      },
      facility_name: String, // Snapshot for display
      facility_type: String, // "Factory" or "Depot"

      // Pricing snapshot at scheduling time
      subtotal: Number,
      discount_applied: Number,
      final_amount: Number,

      scheduled_at: {
        type: Date,
        default: Date.now,
      },
      scheduled_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      scheduled_by_name: String, // Snapshot

      notes: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    },
  ],
});

const demandOrderSchema = new mongoose.Schema(
  {
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: [true, "Distributor ID is required"],
      index: true,
    },
    order_number: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "cancelled",
        "forwarded_to_distribution",
        "scheduling_in_progress",
        "scheduling_completed",
      ],
      default: "draft",
      required: true,
      index: true,
    },
    items: {
      type: [demandOrderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    total_amount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },
    item_count: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Approval workflow
    current_approver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    current_approver_role: {
      type: String,
      index: true,
    },
    approval_history: [
      {
        action: {
          type: String,
          enum: [
            "submit",
            "forward",
            "modify",
            "approve",
            "reject",
            "cancel",
            "schedule",
            "partial_scheduling",
            "scheduling_completed",
          ],
          required: true,
        },
        performed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        performed_by_role: {
          type: String,
          required: true,
        },
        from_status: {
          type: String,
        },
        to_status: {
          type: String,
        },
        comments: {
          type: String,
          trim: true,
          maxlength: 500,
        },
        changes: [
          {
            field: String,
            old_value: mongoose.Schema.Types.Mixed,
            new_value: mongoose.Schema.Types.Mixed,
          },
        ],
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Timestamps for workflow
    submitted_at: {
      type: Date,
      index: true,
    },
    approved_at: {
      type: Date,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejected_at: {
      type: Date,
    },
    rejected_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejection_reason: {
      type: String,
      trim: true,
    },
    cancelled_at: {
      type: Date,
    },
    cancelled_reason: {
      type: String,
      trim: true,
    },
    // Audit fields
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Generate order number immediately when creating/saving (even for drafts)
demandOrderSchema.pre("save", async function (next) {
  if (!this.order_number && this.isNew) {
    try {
      // Get distributor's ERP ID
      const Distributor = mongoose.model("Distributor");
      const distributor = await Distributor.findById(this.distributor_id).select("erp_id").lean();

      if (!distributor || !distributor.erp_id) {
        return next(new Error("Distributor ERP ID is required to generate order number"));
      }

      const currentYear = new Date().getFullYear();
      const erpId = distributor.erp_id;

      // Generate order number: DO-YYYY-ERPID-NNNNN
      // Example: DO-2025-12345-00001
      const prefix = `DO-${currentYear}-${erpId}`;

      // Find the last order number for this year and distributor
      const lastOrder = await this.constructor
        .findOne({
          order_number: new RegExp(`^${prefix}-`),
          distributor_id: this.distributor_id,
        })
        .sort({ order_number: -1 })
        .select("order_number")
        .lean();

      let sequence = 1;
      if (lastOrder && lastOrder.order_number) {
        const parts = lastOrder.order_number.split("-");
        if (parts.length === 4) {
          const lastSeq = parseInt(parts[3]);
          if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
          }
        }
      }

      this.order_number = `${prefix}-${sequence.toString().padStart(5, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Calculate totals before saving
demandOrderSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.total_amount = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.item_count = this.items.reduce((sum, item) => sum + item.quantity, 0);
  } else {
    this.total_amount = 0;
    this.item_count = 0;
  }
  next();
});

// Compound indexes for efficient queries
demandOrderSchema.index({ distributor_id: 1, status: 1, created_at: -1 });
demandOrderSchema.index({ status: 1, submitted_at: -1 });

const DemandOrder = mongoose.model("DemandOrder", demandOrderSchema);

module.exports = DemandOrder;
