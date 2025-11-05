const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema(
  {
    sales_organization: {
      type: String,
      required: [true, "Sales organization is required"],
      trim: true,
    },
    bank_name: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
    },
    account_no: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
      unique: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
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
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "banks",
  }
);

// Indexes
bankSchema.index({ bank_name: 1 });
bankSchema.index({ account_no: 1 });
bankSchema.index({ active: 1 });

const Bank = mongoose.model("Bank", bankSchema);

module.exports = Bank;
