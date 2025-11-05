const mongoose = require("mongoose");

const customerLedgerSchema = new mongoose.Schema(
  {
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: [true, "Distributor ID is required"],
      index: true,
    },
    particulars: {
      type: String,
      trim: true,
      default: "",
    },
    transaction_date: {
      type: Date,
      required: [true, "Transaction date is required"],
      index: true,
    },
    voucher_type: {
      type: String,
      required: [true, "Voucher type is required"],
      trim: true,
      index: true,
    },
    voucher_no: {
      type: String,
      required: [true, "Voucher number is required"],
      trim: true,
      index: true,
    },
    debit: {
      type: Number,
      default: 0,
      min: [0, "Debit cannot be negative"],
      set: (val) => (val ? Math.round(val * 100) / 100 : 0), // 2 decimal points
    },
    credit: {
      type: Number,
      default: 0,
      min: [0, "Credit cannot be negative"],
      set: (val) => (val ? Math.round(val * 100) / 100 : 0), // 2 decimal points
    },
    note: {
      type: String,
      trim: true,
    },
    // Audit fields
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Compound index for better query performance
customerLedgerSchema.index({ distributor_id: 1, transaction_date: -1 });
customerLedgerSchema.index({ distributor_id: 1, voucher_no: 1 });

// Virtual field for closing balance (calculated on-the-fly)
// Note: This will be calculated in the application logic based on running balance
customerLedgerSchema.virtual("closing").get(function () {
  // This is a placeholder - actual closing balance will be calculated
  // in the API response based on cumulative debit-credit
  return 0;
});

// Ensure virtuals are included in JSON responses
customerLedgerSchema.set("toJSON", { virtuals: true });
customerLedgerSchema.set("toObject", { virtuals: true });

// Pre-save validation: Ensure at least one of debit or credit is non-zero
customerLedgerSchema.pre("save", function (next) {
  if (this.debit === 0 && this.credit === 0) {
    return next(new Error("Either debit or credit must be non-zero"));
  }
  // Business rule: typically a transaction is either debit OR credit, not both
  if (this.debit > 0 && this.credit > 0) {
    return next(new Error("A transaction cannot have both debit and credit"));
  }
  next();
});

const CustomerLedger = mongoose.model("CustomerLedger", customerLedgerSchema);

module.exports = CustomerLedger;
