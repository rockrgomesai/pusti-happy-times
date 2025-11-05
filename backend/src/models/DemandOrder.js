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
    offer_code: String,
    discount_percentage: Number,
  },
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
      enum: ["draft", "submitted", "approved", "rejected", "cancelled"],
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

// Generate order number on submit
demandOrderSchema.pre("save", async function (next) {
  if (this.status === "submitted" && !this.order_number) {
    // Generate order number: DO-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    
    // Find the last order number for today
    const lastOrder = await this.constructor
      .findOne({ order_number: new RegExp(`^DO-${dateStr}`) })
      .sort({ order_number: -1 })
      .select("order_number")
      .lean();

    let sequence = 1;
    if (lastOrder && lastOrder.order_number) {
      const lastSeq = parseInt(lastOrder.order_number.split("-")[2]);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    this.order_number = `DO-${dateStr}-${sequence.toString().padStart(5, "0")}`;
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
