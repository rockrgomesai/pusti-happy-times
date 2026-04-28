/**
 * Secondary Order Model
 * Orders placed by Sales Officers at outlets for distributor stock
 */

const mongoose = require("mongoose");

const secondaryOrderSchema = new mongoose.Schema(
  {
    // Unique identifier
    order_number: {
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
    dsr_id: {
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
    visit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutletVisit",
    },

    // Order details
    order_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Order items
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        sku: {
          type: String,
          required: true,
          uppercase: true,
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
      },
    ],

    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Applied offers
    applied_offers: [
      {
        offer_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SecondaryOffer",
        },
        offer_name: {
          type: String,
          trim: true,
        },
        discount_amount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    // Order workflow
    order_status: {
      type: String,
      required: true,
      enum: {
        values: ["Submitted", "Approved", "Cancelled", "Delivered"],
        message: "Invalid order status",
      },
      default: "Submitted",
      index: true,
    },

    // Delivery information (populated by web portal)
    delivery_chalan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryChalan",
    },
    delivery_chalan_no: {
      type: String,
      trim: true,
    },
    delivery_date: {
      type: Date,
    },
    delivered_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // GPS location at time of order
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

    // Notes
    so_notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    approval_notes: {
      type: String,
      trim: true,
    },
    cancellation_reason: {
      type: String,
      trim: true,
    },

    // Approval tracking
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approved_at: {
      type: Date,
    },

    // Cancellation tracking
    cancelled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelled_at: {
      type: Date,
    },

    // Delivery tracking
    delivered_at: {
      type: Date,
    },

    // Entry mode — how the order was captured (for offline tracking & audit)
    entry_mode: {
      type: String,
      enum: ["online", "offline", "manual"],
      default: "online",
    },
    client_order_uid: {
      type: String,
      index: true, // dedupe offline syncs
    },

    // Timestamps
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
secondaryOrderSchema.index({ order_date: -1 });
secondaryOrderSchema.index({ outlet_id: 1, order_date: -1 });
secondaryOrderSchema.index({ distributor_id: 1, order_date: -1 });
secondaryOrderSchema.index({ dsr_id: 1, order_date: -1 });
secondaryOrderSchema.index({ order_status: 1, order_date: -1 });
secondaryOrderSchema.index({ gps_location: "2dsphere" });

// Pre-save middleware: Auto-calculate totals
secondaryOrderSchema.pre("save", function (next) {
  if (this.isModified("items")) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);

    // Calculate discount from applied offers
    this.discount_amount = this.applied_offers.reduce((sum, offer) => sum + offer.discount_amount, 0);

    // Calculate final total
    this.total_amount = this.subtotal - this.discount_amount;
  }
  next();
});

// Static method: Generate order number
secondaryOrderSchema.statics.generateOrderNumber = async function () {
  const prefix = "SO";
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, "0");

  // Find latest order for this month
  const latestOrder = await this.findOne({
    order_number: { $regex: `^${prefix}${year}${month}` },
  })
    .sort({ order_number: -1 })
    .select("order_number");

  let sequence = 1;
  if (latestOrder) {
    const lastSequence = parseInt(latestOrder.order_number.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${String(sequence).padStart(4, "0")}`;
};

// Virtual: Total items count
secondaryOrderSchema.virtual("items_count").get(function () {
  return this.items.length;
});

// Virtual: Total quantity
secondaryOrderSchema.virtual("total_quantity").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

const SecondaryOrder = mongoose.model("SecondaryOrder", secondaryOrderSchema);

module.exports = SecondaryOrder;
