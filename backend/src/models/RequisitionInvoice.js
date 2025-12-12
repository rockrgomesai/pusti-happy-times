/**
 * Requisition Invoice Model
 * Tracks invoices for requisition deliveries (depot-to-depot transfers)
 * Similar to DeliveryInvoice.js but for requisitions
 * Supports 4 copies for physical documentation
 * Includes pricing information (unlike chalans which are quantity-only)
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RequisitionInvoiceItemSchema = new Schema(
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
    dp_price: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } }
);

const RequisitionInvoiceSchema = new Schema(
  {
    invoice_no: {
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
    chalan_id: {
      type: Schema.Types.ObjectId,
      ref: "RequisitionChalan",
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
    items: [RequisitionInvoiceItemSchema],
    subtotal: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    tax_amount: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    tax_percentage: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    total_amount: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    invoice_date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    due_date: Date,
    remarks: String,
    status: {
      type: String,
      enum: ["Generated", "Paid", "Partial", "Cancelled"],
      default: "Generated",
      index: true,
    },
    payment_status: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
      index: true,
    },
    // 4 copies support for physical documentation
    copy_number: {
      type: Number,
      min: 1,
      max: 4,
      default: 1,
    },
    master_invoice_id: {
      type: Schema.Types.ObjectId,
      ref: "RequisitionInvoice",
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approved_at: Date,
    approved_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true },
    toObject: { getters: true },
    collection: "requisition_invoices",
  }
);

// Indexes
RequisitionInvoiceSchema.index({ invoice_date: -1 });
RequisitionInvoiceSchema.index({ source_depot_id: 1, invoice_date: -1 });
RequisitionInvoiceSchema.index({ requesting_depot_id: 1, invoice_date: -1 });
RequisitionInvoiceSchema.index({ status: 1 });
RequisitionInvoiceSchema.index({ payment_status: 1 });

// Generate invoice number
RequisitionInvoiceSchema.statics.generateInvoiceNumber = async function () {
  const lastInvoice = await this.findOne().sort({ created_at: -1 }).select("invoice_no").lean();

  if (!lastInvoice || !lastInvoice.invoice_no) {
    return "RINV-000001";
  }

  const lastNumber = parseInt(lastInvoice.invoice_no.split("-")[1]);
  const nextNumber = (lastNumber + 1).toString().padStart(6, "0");
  return `RINV-${nextNumber}`;
};

module.exports = mongoose.model("RequisitionInvoice", RequisitionInvoiceSchema);
