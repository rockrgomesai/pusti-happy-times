const mongoose = require("mongoose");

// Transfer detail schema
const transferDetailSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    trim: true,
  },
  product_name: {
    type: String,
    required: true,
  },
  product_type: {
    type: String,
    enum: ["MANUFACTURED", "PROCURED"],
    required: true,
  },
  unit: {
    type: String,
    enum: ["CTN", "PCS"],
    required: true,
    default: "CTN",
  },
  qty_sent: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  qty_received: {
    type: Number,
    default: 0,
    min: [0, "Received quantity cannot be negative"],
  },
  unit_price: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
});

// Main depot transfer schema
const depotTransferSchema = new mongoose.Schema(
  {
    transfer_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    from_depot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    to_depot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    transfer_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Pending", "In-Transit", "Partially-Received", "Received", "Cancelled"],
      default: "Pending",
    },
    items: [transferDetailSchema],
    total_items: {
      type: Number,
      default: 0,
    },
    total_qty_sent: {
      type: Number,
      default: 0,
    },
    total_qty_received: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    sent_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
    received_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    received_at: {
      type: Date,
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
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
depotTransferSchema.index({ transfer_number: 1 });
depotTransferSchema.index({ from_depot_id: 1, status: 1, transfer_date: -1 });
depotTransferSchema.index({ to_depot_id: 1, status: 1, transfer_date: -1 });
depotTransferSchema.index({ status: 1, transfer_date: -1 });
depotTransferSchema.index({ sent_by: 1 });
depotTransferSchema.index({ received_by: 1 });

// Pre-save middleware to calculate totals
depotTransferSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.total_items = this.items.length;
    this.total_qty_sent = this.items.reduce((sum, item) => sum + item.qty_sent, 0);
    this.total_qty_received = this.items.reduce((sum, item) => sum + item.qty_received, 0);
  } else {
    this.total_items = 0;
    this.total_qty_sent = 0;
    this.total_qty_received = 0;
  }
  next();
});

// Static method to generate transfer number
depotTransferSchema.statics.generateTransferNumber = async function () {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const prefix = `DT-${year}${month}${day}`;

  // Find the latest transfer for today
  const latestTransfer = await this.findOne({
    transfer_number: new RegExp(`^${prefix}`),
  }).sort({ transfer_number: -1 });

  let sequence = 1;
  if (latestTransfer) {
    const lastSequence = parseInt(latestTransfer.transfer_number.split("-").pop());
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(5, "0")}`;
};

const DepotTransfer = mongoose.model("DepotTransfer", depotTransferSchema);

module.exports = DepotTransfer;
