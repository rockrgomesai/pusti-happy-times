const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InvoiceItemSchema = new Schema(
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

const DeliveryInvoiceSchema = new Schema(
  {
    invoice_no: {
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
    chalan_id: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryChalan",
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
    items: [InvoiceItemSchema],
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
    },
    paid_amount: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v ? parseFloat(v.toString()) : 0),
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Debit entry reference (voucher details)
    voucher_type: {
      type: String,
      default: "INV",
    },
    voucher_no: {
      type: String, // DO Number
      required: true,
    },
    particulars: String,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Indexes for efficient queries
DeliveryInvoiceSchema.index({ invoice_date: -1 });
DeliveryInvoiceSchema.index({ depot_id: 1, invoice_date: -1 });
DeliveryInvoiceSchema.index({ distributor_id: 1, invoice_date: -1 });
DeliveryInvoiceSchema.index({ status: 1, invoice_date: -1 });
DeliveryInvoiceSchema.index({ payment_status: 1 });
DeliveryInvoiceSchema.index({ voucher_no: 1 });

// Virtual for remaining amount
DeliveryInvoiceSchema.virtual("remaining_amount").get(function () {
  return parseFloat(this.total_amount) - parseFloat(this.paid_amount);
});

module.exports = mongoose.model("DeliveryInvoice", DeliveryInvoiceSchema);
