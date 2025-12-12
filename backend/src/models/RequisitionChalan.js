/**
 * Requisition Chalan Model
 * Tracks delivery chalans for requisitions (depot-to-depot transfers)
 * Similar to DeliveryChalan.js but for requisitions
 * Supports 4 copies for physical documentation
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RequisitionChalanItemSchema = new Schema(
  {
    requisition_no: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
    },
    sku_name: {
      type: String,
      required: true,
    },
    uom: {
      type: String,
      default: "CTN",
    },
    qty_ctn: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    qty_pcs: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    received_qty_ctn: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    received_qty_pcs: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    damage_qty_ctn: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    damage_qty_pcs: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    damage_reason: {
      type: String,
      default: "",
    },
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } }
);

const RequisitionChalanSchema = new Schema(
  {
    chalan_no: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    load_sheet_id: {
      type: Schema.Types.ObjectId,
      ref: "RequisitionLoadSheet",
      required: true,
      index: true,
    },
    requesting_depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    requesting_depot_name: {
      type: String,
      required: true,
    },
    requesting_depot_address: String,
    requesting_depot_phone: String,
    source_depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    source_depot_name: String,
    transport_id: {
      type: Schema.Types.ObjectId,
      ref: "Transport",
    },
    transport_name: String,
    vehicle_no: String,
    driver_name: String,
    driver_phone: String,
    items: [RequisitionChalanItemSchema],
    total_qty_ctn: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    total_qty_pcs: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    chalan_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    remarks: String,
    status: {
      type: String,
      enum: ["Generated", "Partially Received", "Received", "Cancelled"],
      default: "Generated",
      index: true,
    },
    // 4 copies support for physical documentation
    copy_number: {
      type: Number,
      min: 1,
      max: 4,
      default: 1,
    },
    master_chalan_id: {
      type: Schema.Types.ObjectId,
      ref: "RequisitionChalan",
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    delivered_at: Date,
    delivered_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    received_at: Date,
    received_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    damage_notes: String,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true },
    toObject: { getters: true },
    collection: "requisition_chalans",
  }
);

// Indexes
RequisitionChalanSchema.index({ chalan_date: -1 });
RequisitionChalanSchema.index({ source_depot_id: 1, chalan_date: -1 });
RequisitionChalanSchema.index({ requesting_depot_id: 1, chalan_date: -1 });
RequisitionChalanSchema.index({ status: 1 });

// Generate chalan number
RequisitionChalanSchema.statics.generateChalanNumber = async function () {
  const lastChalan = await this.findOne().sort({ created_at: -1 }).select("chalan_no").lean();

  if (!lastChalan || !lastChalan.chalan_no) {
    return "RCHL-000001";
  }

  const lastNumber = parseInt(lastChalan.chalan_no.split("-")[1]);
  const nextNumber = (lastNumber + 1).toString().padStart(6, "0");
  return `RCHL-${nextNumber}`;
};

module.exports = mongoose.model("RequisitionChalan", RequisitionChalanSchema);
