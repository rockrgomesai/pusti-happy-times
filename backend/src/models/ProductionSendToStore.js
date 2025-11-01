/**
 * ProductionSendToStore Model
 * Tracks products sent from Factory production to Factory Store (Depot)
 */

const mongoose = require("mongoose");

const productionSendToStoreDetailSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  qty: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    validate: {
      validator: function (v) {
        const value = parseFloat(v.toString());
        return value > 0;
      },
      message: "Quantity must be greater than 0",
    },
  },
  production_date: {
    type: Date,
    required: true,
    index: true,
  },
  expiry_date: {
    type: Date,
    required: true,
  },
  batch_no: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  note: {
    type: String,
    default: null,
    trim: true,
  },
});

const productionSendToStoreSchema = new mongoose.Schema(
  {
    ref: {
      type: String,
      unique: true,
      required: false, // Auto-generated in pre-save hook
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    facility_store_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
      index: true,
    },
    details: {
      type: [productionSendToStoreDetailSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one product detail is required",
      },
    },
    status: {
      type: String,
      enum: ["draft", "sent", "received", "cancelled"],
      default: "sent",
      index: true,
    },
    // Received tracking fields
    received_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    received_at: {
      type: Date,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "production_send_to_store",
  }
);

// Compound index for batch_no and product_id uniqueness per shipment
productionSendToStoreSchema.index({ "details.batch_no": 1, "details.product_id": 1 });

// Index for common queries
productionSendToStoreSchema.index({ created_at: -1 });
productionSendToStoreSchema.index({ facility_id: 1, created_at: -1 });

// Pre-save hook to auto-generate ref number
productionSendToStoreSchema.pre("save", async function (next) {
  if (this.isNew && !this.ref) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const datePrefix = `prod-${year}${month}${day}`;

      // Find the latest ref number for today
      const latestDoc = await this.constructor
        .findOne({
          ref: { $regex: `^${datePrefix}-` },
        })
        .sort({ ref: -1 })
        .select("ref")
        .lean();

      let serial = 1;
      if (latestDoc && latestDoc.ref) {
        const parts = latestDoc.ref.split("-");
        const lastSerial = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSerial)) {
          serial = lastSerial + 1;
        }
      }

      this.ref = `${datePrefix}-${String(serial).padStart(3, "0")}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-validate hook to ensure products are MANUFACTURED type
productionSendToStoreSchema.pre("validate", async function (next) {
  if (this.details && this.details.length > 0) {
    try {
      const Product = mongoose.model("Product");
      const productIds = this.details.map((d) => d.product_id);

      // Check all products exist and are MANUFACTURED
      const products = await Product.find({
        _id: { $in: productIds },
      }).select("_id product_type");

      if (products.length !== productIds.length) {
        return next(new Error("One or more products not found"));
      }

      const nonManufactured = products.filter((p) => p.product_type !== "MANUFACTURED");
      if (nonManufactured.length > 0) {
        return next(
          new Error("All products must be MANUFACTURED type for production send to store")
        );
      }

      // Validate expiry_date > production_date for each detail
      for (const detail of this.details) {
        if (detail.expiry_date <= detail.production_date) {
          return next(new Error("Expiry date must be after production date"));
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Instance method to get total quantity
productionSendToStoreSchema.methods.getTotalQuantity = function () {
  return this.details.reduce((sum, detail) => {
    return sum + parseFloat(detail.qty.toString());
  }, 0);
};

// Static method to get shipments by date range
productionSendToStoreSchema.statics.findByDateRange = function (startDate, endDate, filters = {}) {
  const query = {
    created_at: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    ...filters,
  };
  return this.find(query).sort({ created_at: -1 });
};

const ProductionSendToStore = mongoose.model("ProductionSendToStore", productionSendToStoreSchema);

module.exports = ProductionSendToStore;
