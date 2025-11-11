/**
 * BdBank Model - Bangladesh Banks
 */

const mongoose = require("mongoose");

const bdBankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    short_name: {
      type: String,
      trim: true,
    },
    bank_code: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    swift_code: {
      type: String,
      trim: true,
      sparse: true,
    },
    routing_number: {
      type: String,
      trim: true,
      sparse: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
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
    collection: "bd_banks",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

// Indexes
bdBankSchema.index({ name: 1 });
bdBankSchema.index({ active: 1 });
bdBankSchema.index({ name: "text" }); // For text search

const BdBank = mongoose.model("BdBank", bdBankSchema);

module.exports = BdBank;
