/**
 * Collection Model
 * Payment collection from distributors (Bank or Cash)
 */

const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    // Transaction ID (Auto-generated, unique)
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // Auto-generated in pre-validate hook
    },

    // Distributor Reference
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distributor",
      required: true,
      index: true,
    },

    // Demand Order Reference (Optional)
    do_no: {
      type: String,
      index: true,
      default: null,
    },

    // Payment Method (Radio Selection)
    payment_method: {
      type: String,
      enum: ["Bank", "Cash"],
      required: true,
    },

    // === BANK PAYMENT FIELDS ===
    company_bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BdBank",
    },

    company_bank_account_no: {
      type: String,
      trim: true,
    },

    depositor_bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BdBank",
    },

    depositor_branch: {
      type: String,
      trim: true,
    },

    // === CASH PAYMENT FIELDS ===
    cash_method: {
      type: String,
      enum: [
        "Petty Cash",
        "Provision for Commission",
        "Provision for Incentive",
        "Provision for Damage",
      ],
    },

    // === COMMON FIELDS ===
    depositor_mobile: {
      type: String,
      required: true,
      trim: true,
    },

    deposit_amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    deposit_date: {
      type: Date,
      required: true,
      index: true,
    },

    note: {
      type: String,
      default: null,
      trim: true,
    },

    // Image Upload
    image: {
      file_name: String,
      file_path: String,
      file_size: Number,
      mime_type: String,
      uploaded_at: Date,
    },

    // Approval Workflow
    approval_status: {
      type: String,
      enum: [
        "pending",
        "forwarded_to_area_manager",
        "forwarded_to_regional_manager",
        "forwarded_to_zonal_manager_and_sales_admin",
        "forwarded_to_order_management",
        "forwarded_to_finance",
        "returned_to_sales_admin", // Returned from Order Mgmt or Finance
        "approved",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    // Current handler (who should act on it now)
    current_handler_role: {
      type: String,
      enum: ["Distributor", "ASM", "RSM", "ZSM", "Sales Admin", "Order Management", "Finance"],
      default: "ASM",
    },

    current_handler_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Approval Chain (history of all actions)
    approval_chain: [
      {
        action: {
          type: String,
          enum: ["submit", "forward", "return", "edit", "approve", "cancel"],
          required: true,
        },
        from_role: String,
        to_role: String,
        performed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        performed_by_name: String, // Cached for display
        comments: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Cancellation details
    cancelled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelled_at: Date,
    cancellation_reason: String,

    // Approval details
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approved_at: Date,

    // CustomerLedger reference (created after approval)
    ledger_entry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerLedger",
    },

    // Audit Fields
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
    collection: "collections",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

// Indexes
collectionSchema.index({ transaction_id: 1 }, { unique: true });
collectionSchema.index({ distributor_id: 1, created_at: -1 });
collectionSchema.index({ do_no: 1 });
collectionSchema.index({ payment_method: 1, deposit_date: -1 });

// Virtual for formatted deposit_amount
collectionSchema.virtual("deposit_amount_formatted").get(function () {
  if (this.deposit_amount) {
    return parseFloat(this.deposit_amount.toString()).toFixed(2);
  }
  return "0.00";
});

// Pre-validate: Generate transaction_id before validation
collectionSchema.pre("validate", async function (next) {
  if (!this.transaction_id) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    // Find last transaction for today
    const lastCollection = await this.constructor
      .findOne({ transaction_id: new RegExp(`^COL-${dateStr}`) })
      .sort({ transaction_id: -1 })
      .select("transaction_id")
      .lean();

    let sequence = 1;
    if (lastCollection && lastCollection.transaction_id) {
      const lastSeq = parseInt(lastCollection.transaction_id.split("-")[2]);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    this.transaction_id = `COL-${dateStr}-${sequence.toString().padStart(5, "0")}`;
  }
  next();
});

// Pre-save: Initialize approval chain
collectionSchema.pre("save", async function (next) {
  // Initialize approval chain on first save
  if (this.isNew && this.approval_chain.length === 0) {
    this.approval_chain.push({
      action: "submit",
      from_role: "Distributor",
      to_role: "ASM",
      performed_by: this.created_by,
      performed_by_name: "Distributor", // Will be populated by controller
      comments: "Payment submitted for approval",
      timestamp: new Date(),
    });
  }

  next();
});

// Pre-save: Validate conditional fields
collectionSchema.pre("save", function (next) {
  if (this.payment_method === "Bank") {
    // Validate Bank fields
    if (!this.company_bank) {
      return next(new Error("Company bank is required for bank payment"));
    }
    if (!this.company_bank_account_no) {
      return next(new Error("Company bank account number is required for bank payment"));
    }
    if (!this.depositor_bank) {
      return next(new Error("Depositor bank is required for bank payment"));
    }
    if (!this.depositor_branch) {
      return next(new Error("Depositor branch is required for bank payment"));
    }
    // Clear cash fields
    this.cash_method = undefined;
  } else if (this.payment_method === "Cash") {
    // Validate Cash fields
    if (!this.cash_method) {
      return next(new Error("Cash method is required for cash payment"));
    }
    // Clear bank fields
    this.company_bank = undefined;
    this.company_bank_account_no = undefined;
    this.depositor_bank = undefined;
    this.depositor_branch = undefined;
  }
  next();
});

// Validate image size (8MB = 8 * 1024 * 1024 bytes)
collectionSchema.path("image.file_size").validate(function (value) {
  if (value && value > 8 * 1024 * 1024) {
    return false;
  }
  return true;
}, "Image size must not exceed 8MB");

// Transform Decimal128 to string in JSON
collectionSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (ret.deposit_amount instanceof mongoose.Types.Decimal128) {
      ret.deposit_amount = parseFloat(ret.deposit_amount.toString()).toFixed(2);
    }
    return ret;
  },
});

const Collection = mongoose.model("Collection", collectionSchema);

module.exports = Collection;
