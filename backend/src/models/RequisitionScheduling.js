/**
 * Requisition Scheduling Model
 * Tracks scheduling of requisitions by Distribution role
 */

const mongoose = require("mongoose");

const schedulingDetailSchema = new mongoose.Schema({
  requisition_detail_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    uppercase: true,
  },
  erp_id: {
    type: Number,
    required: true,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  order_qty: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
  },
  delivery_qty: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
  },
  source_depot_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Facility",
    required: true,
  },
  target_depot_id: {
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
    required: true,
  },
  scheduled_by_name: String,
});

const requisitionSchedulingSchema = new mongoose.Schema(
  {
    requisition_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryRequisition",
      required: true,
      index: true,
    },
    requisition_no: {
      type: String,
      required: true,
      index: true,
    },
    scheduling_details: [schedulingDetailSchema],
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "requisition_schedulings",
  }
);

// Indexes
requisitionSchedulingSchema.index({ requisition_id: 1, status: 1 });
requisitionSchedulingSchema.index({ "scheduling_details.source_depot_id": 1 });
requisitionSchedulingSchema.index({ "scheduling_details.target_depot_id": 1 });
requisitionSchedulingSchema.index({ created_at: -1 });

module.exports = mongoose.model("RequisitionScheduling", requisitionSchedulingSchema);
