/**
 * Requisition Load Sheet Model
 * Tracks load sheets for requisition deliveries (depot-to-depot transfers)
 * Similar to LoadSheet.js but for requisitions instead of demand orders
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Item schema for requisition scheduling details in load sheet
const ReqItemSchema = new Schema(
  {
    requisition_id: {
      type: Schema.Types.ObjectId,
      ref: "InventoryRequisition",
      required: true,
    },
    requisition_no: {
      type: String,
      required: true,
    },
    requisition_date: {
      type: Date,
      required: true,
    },
    requisition_scheduling_id: {
      type: Schema.Types.ObjectId,
      ref: "RequisitionScheduling",
      required: true,
    },
    requisition_detail_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    product_name: String,
    order_qty: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    previously_delivered_qty: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    undelivered_qty: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    delivery_qty: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    unit: {
      type: String,
      default: "CTN",
    },
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } }
);

// Grouping by requesting depot (target depot that needs goods)
const RequestingDepotItemsSchema = new Schema(
  {
    requesting_depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    requesting_depot_name: String,
    requesting_depot_code: String,
    req_items: [ReqItemSchema],
  },
  { _id: false }
);

// Stock validation cache
const StockValidationCacheSchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
    },
    available: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    allocated: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    remaining: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } }
);

const RequisitionLoadSheetSchema = new Schema(
  {
    load_sheet_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Locked", "Loading", "Loaded", "Generated"],
      default: "Draft",
      index: true,
    },
    source_depot_id: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    delivery_date: {
      type: Date,
      required: true,
      index: true,
    },
    vehicle_info: {
      vehicle_no: String,
      driver_name: String,
      driver_phone: String,
    },
    transport_id: {
      type: Schema.Types.ObjectId,
      ref: "Transport",
    },
    requesting_depots: [RequestingDepotItemsSchema],
    stock_validation_cache: [StockValidationCacheSchema],
    total_items_count: {
      type: Number,
      default: 0,
    },
    total_delivery_qty: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    notes: String,
    locked_at: Date,
    locked_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    generated_at: Date,
    generated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    chalan_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: "RequisitionChalan",
      },
    ],
    invoice_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: "RequisitionInvoice",
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true },
    toObject: { getters: true },
    collection: "requisition_load_sheets",
  }
);

// Indexes
RequisitionLoadSheetSchema.index({ source_depot_id: 1, delivery_date: -1 });
RequisitionLoadSheetSchema.index({ status: 1, source_depot_id: 1 });
RequisitionLoadSheetSchema.index({ created_at: -1 });
RequisitionLoadSheetSchema.index({ "requesting_depots.requesting_depot_id": 1 });

// Generate load sheet number
RequisitionLoadSheetSchema.statics.generateLoadSheetNumber = async function () {
  const lastSheet = await this.findOne()
    .sort({ created_at: -1 })
    .select("load_sheet_number")
    .lean();

  if (!lastSheet || !lastSheet.load_sheet_number) {
    return "RLS-000001";
  }

  const lastNumber = parseInt(lastSheet.load_sheet_number.split("-")[1]);
  const nextNumber = (lastNumber + 1).toString().padStart(6, "0");
  return `RLS-${nextNumber}`;
};

module.exports = mongoose.model("RequisitionLoadSheet", RequisitionLoadSheetSchema);
