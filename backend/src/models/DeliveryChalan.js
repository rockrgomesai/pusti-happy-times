const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChalanItemSchema = new Schema(
  {
    do_number: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
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

const DeliveryChalanSchema = new Schema(
  {
    chalan_no: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    load_sheet_id: {
      type: Schema.Types.ObjectId,
      ref: "LoadSheet",
      required: true,
      index: true,
    },
    distributor_id: {
      type: Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
      index: true,
    },
    distributor_name: {
      type: String,
      required: true,
    },
    distributor_address: String,
    distributor_phone: String,
    depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    depot_name: String,
    transport_id: {
      type: Schema.Types.ObjectId,
      ref: "Transport",
    },
    transport_name: String,
    vehicle_no: String,
    driver_name: String,
    driver_phone: String,
    items: [ChalanItemSchema],
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
      enum: ["Generated", "Partially Received", "Received", "Delivered", "Cancelled"],
      default: "Generated",
      index: true,
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
  }
);

// Indexes for efficient queries
DeliveryChalanSchema.index({ chalan_date: -1 });
DeliveryChalanSchema.index({ depot_id: 1, chalan_date: -1 });
DeliveryChalanSchema.index({ distributor_id: 1, chalan_date: -1 });
DeliveryChalanSchema.index({ status: 1, chalan_date: -1 });

// Virtual for chalan display
DeliveryChalanSchema.virtual("chalan_display").get(function () {
  return `${this.chalan_no} - ${this.distributor_name}`;
});

module.exports = mongoose.model("DeliveryChalan", DeliveryChalanSchema);
