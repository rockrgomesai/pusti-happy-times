const mongoose = require("mongoose");

const schedulingDetailSchema = new mongoose.Schema({
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  product_name: String,
  dp_price: {
    type: Number,
    required: true,
  },
  order_qty: {
    type: Number,
    required: true,
  },
  scheduled_qty: {
    type: Number,
    default: 0,
  },
  delivery_qty: {
    type: Number,
    required: true,
  },
  depot_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Facility",
    required: true,
  },
  scheduled_at: {
    type: Date,
    default: Date.now,
  },
  scheduled_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  approval_status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  approved_at: {
    type: Date,
  },
});

const schedulingStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      "Pending-scheduling",
      "Finance-to-approve",
      "Partially Approved",
      "Approved",
      "Rejected",
    ],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  comments: String,
});

const schedulingSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DemandOrder",
      required: true,
    },
    order_number: {
      type: String,
      required: true,
      index: true,
    },
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
      index: true,
    },
    depot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    items: [
      {
        item_id: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        sku: {
          type: String,
          required: true,
        },
        product_name: String,
        dp_price: {
          type: Number,
          required: true,
        },
        order_qty: {
          type: Number,
          required: true,
        },
        scheduled_qty: {
          type: Number,
          default: 0,
        },
        unscheduled_qty: {
          type: Number,
          required: true,
        },
      },
    ],
    scheduling_details: [schedulingDetailSchema],
    scheduling_status: [schedulingStatusSchema],
    current_status: {
      type: String,
      enum: [
        "Pending-scheduling",
        "Finance-to-approve",
        "Partially Approved",
        "Approved",
        "Rejected",
      ],
      default: "Pending-scheduling",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
schedulingSchema.index({ depot_id: 1, distributor_id: 1 });
schedulingSchema.index({ order_number: 1 });
schedulingSchema.index({ current_status: 1 });

module.exports = mongoose.model("Scheduling", schedulingSchema);
