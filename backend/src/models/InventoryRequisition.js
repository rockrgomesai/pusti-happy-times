const mongoose = require("mongoose");

const inventoryRequisitionDetailSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  qty: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    min: 0,
  },
  production_date: {
    type: Date,
  },
  expiry_date: {
    type: Date,
  },
  batch_no: {
    type: String,
  },
  note: {
    type: String,
  },
});

const inventoryRequisitionSchema = new mongoose.Schema(
  {
    requisition_no: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requisition_date: {
      type: Date,
      required: true,
    },
    from_depot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    details: [inventoryRequisitionDetailSchema],
    status: {
      type: String,
      enum: ["submitted", "approved", "rejected", "fulfilled", "cancelled"],
      default: "submitted",
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
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "inventory_manufactured_requisitions",
  }
);

// Generate unique requisition number
inventoryRequisitionSchema.statics.generateRequisitionNo = async function () {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");

  // Find the last requisition for today
  const lastRequisition = await this.findOne({
    requisition_no: new RegExp(`^req-${dateStr}-`),
  })
    .sort({ requisition_no: -1 })
    .limit(1);

  let sequence = 1;
  if (lastRequisition) {
    const lastSeq = parseInt(lastRequisition.requisition_no.split("-").pop());
    sequence = lastSeq + 1;
  }

  return `req-${dateStr}-${String(sequence).padStart(3, "0")}`;
};

// Virtual for converting Decimal128 to number
inventoryRequisitionSchema.virtual("details_plain").get(function () {
  return this.details.map((detail) => ({
    ...detail.toObject(),
    qty: detail.qty ? parseFloat(detail.qty.toString()) : 0,
  }));
});

// Ensure virtuals are included in JSON
inventoryRequisitionSchema.set("toJSON", { virtuals: true });
inventoryRequisitionSchema.set("toObject", { virtuals: true });

const InventoryRequisition = mongoose.model("InventoryRequisition", inventoryRequisitionSchema);

module.exports = InventoryRequisition;
