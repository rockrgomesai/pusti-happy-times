const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DOItemSchema = new Schema(
  {
    do_id: {
      type: Schema.Types.ObjectId,
      ref: "DemandOrder",
      required: true,
    },
    order_number: {
      type: String,
      required: true,
    },
    order_date: {
      type: Date,
      required: true,
    },
    sku: {
      type: String,
      required: true,
      index: true,
    },
    order_qty: {
      type: Schema.Types.Decimal128,
      required: true,
      get: function (value) {
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    previously_delivered_qty: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: function (value) {
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    undelivered_qty: {
      type: Schema.Types.Decimal128,
      required: true,
      get: function (value) {
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    delivery_qty: {
      type: Schema.Types.Decimal128,
      required: true,
      get: function (value) {
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    unit: {
      type: String,
      default: "CTN",
    },
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } }
);

const DistributorItemsSchema = new Schema(
  {
    distributor_id: {
      type: Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
      index: true,
    },
    distributor_name: String,
    distributor_code: String,
    do_items: [DOItemSchema],
  },
  { _id: false }
);

const StockValidationCacheSchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
    },
    available: {
      type: Schema.Types.Decimal128,
      required: true,
      get: function (value) {
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    allocated: {
      type: Schema.Types.Decimal128,
      required: true,
      get: function (value) {
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    remaining: {
      type: Schema.Types.Decimal128,
      required: true,
      get: function (value) {
        return value ? parseFloat(value.toString()) : 0;
      },
    },
  },
  { _id: false, toJSON: { getters: true }, toObject: { getters: true } }
);

const LoadSheetSchema = new Schema(
  {
    load_sheet_number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "Draft",
        "Locked",
        "Chalan_Generated",
        "Invoice_Generated",
        "Completed",
        "Validated",
        "Loading",
        "Loaded",
        "Converted",
      ],
      default: "Draft",
      index: true,
    },
    depot_id: {
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
    transport_id: {
      type: Schema.Types.ObjectId,
      ref: "Transport",
    },
    vehicle_info: {
      vehicle_no: String,
      driver_name: String,
      driver_phone: String,
    },
    locked_at: Date,
    locked_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    distributors: [DistributorItemsSchema],
    stock_validation_cache: [StockValidationCacheSchema],
    chalan_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: "DeliveryChalan",
      },
    ],
    invoice_ids: [
      {
        type: Schema.Types.ObjectId,
        ref: "DeliveryInvoice",
      },
    ],
    notes: String,
    converted_at: Date,
    converted_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Indexes for efficient queries
LoadSheetSchema.index({ status: 1, created_at: -1 });
LoadSheetSchema.index({ depot_id: 1, status: 1 });
LoadSheetSchema.index({ delivery_date: 1 });
LoadSheetSchema.index({ "distributors.distributor_id": 1 });

// Auto-generate load_sheet_number
LoadSheetSchema.pre("save", async function (next) {
  if (this.isNew && !this.load_sheet_number) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const prefix = `LS-${year}${month}${day}`;

    // Find the last load sheet for today
    const lastLoadSheet = await this.constructor
      .findOne({ load_sheet_number: new RegExp(`^${prefix}`) })
      .sort({ load_sheet_number: -1 })
      .select("load_sheet_number");

    let sequence = 1;
    if (lastLoadSheet) {
      const lastSequence = parseInt(lastLoadSheet.load_sheet_number.split("-").pop());
      sequence = lastSequence + 1;
    }

    this.load_sheet_number = `${prefix}-${String(sequence).padStart(3, "0")}`;
  }
  next();
});

// Virtual for total items
LoadSheetSchema.virtual("total_items").get(function () {
  return this.distributors.reduce((sum, dist) => sum + dist.do_items.length, 0);
});

// Virtual for total quantity
LoadSheetSchema.virtual("total_quantity").get(function () {
  return this.distributors.reduce((sum, dist) => {
    return (
      sum +
      dist.do_items.reduce((itemSum, item) => {
        return itemSum + (item.delivery_qty || 0);
      }, 0)
    );
  }, 0);
});

// Virtual for distributors count
LoadSheetSchema.virtual("distributors_count").get(function () {
  return this.distributors.length;
});

module.exports = mongoose.model("LoadSheet", LoadSheetSchema);
