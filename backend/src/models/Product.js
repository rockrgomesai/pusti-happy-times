/**
 * Product Model
 * Unified schema for manufactured and procured products.
 */

const mongoose = require("mongoose");

const PRODUCT_TYPES = ["MANUFACTURED", "PROCURED"];
const PRODUCT_UNITS = ["BAG", "BOX", "CASE", "CTN", "JAR", "POUCH", "PCS"];
const MANUFACTURED_UNITS = ["BAG", "BOX", "CASE", "CTN", "JAR", "POUCH"];
const PROCURED_UNITS = ["PCS"];

const productSchema = new mongoose.Schema(
  {
    product_type: {
      type: String,
      enum: PRODUCT_TYPES,
      required: true,
      uppercase: true,
      index: true,
    },
    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    trade_price: {
      type: Number,
      required: true,
      min: [0, "Trade price must be greater than or equal to 0"],
      default: 0,
      index: true,
    },
    unit: {
      type: String,
      enum: PRODUCT_UNITS,
      required: true,
    },
    wt_pcs: {
      type: Number,
      required: true,
      min: [0, "Weight per piece must be greater than or equal to 0"],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    bangla_name: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    erp_id: {
      type: Number,
      sparse: true,
    },
    factory_ids: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Factory",
        },
      ],
      default: [],
    },
    db_price: {
      type: Number,
      min: [0, "Distributor price must be greater than or equal to 0"],
      default: null,
    },
    mrp: {
      type: Number,
      min: [0, "MRP must be greater than or equal to 0"],
      default: null,
      index: true,
    },
    ctn_pcs: {
      type: Number,
      min: [0, "Carton pieces must be greater than or equal to 0"],
      default: null,
    },
    launch_date: {
      type: Date,
      default: null,
      index: true,
    },
    decommission_date: {
      type: Date,
      default: null,
      index: true,
    },
    image_url: {
      type: String,
      trim: true,
      default: null,
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    created_by: {
      type: String,
      required: true,
      trim: true,
    },
    updated_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    updated_by: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: "products",
    versionKey: false,
  }
);

productSchema.index({ product_type: 1, active: 1 }, { name: "idx_type_active" });
productSchema.index({ brand_id: 1, category_id: 1, active: 1 }, { name: "idx_brand_category_active" });
productSchema.index({ product_type: 1, brand_id: 1 }, { name: "idx_type_brand" });
productSchema.index({ sku: "text", bangla_name: "text" }, { name: "idx_text_search" });
productSchema.index({ factory_ids: 1 }, { name: "idx_factory_ids" });

const assignNullsForProcured = (doc) => {
  doc.bangla_name = null;
  doc.erp_id = null;
  doc.factory_ids = [];
  doc.db_price = null;
  doc.mrp = null;
  doc.ctn_pcs = null;
  doc.launch_date = null;
  doc.decommission_date = null;
  doc.image_url = null;
};

productSchema.pre("validate", function (next) {
  if (!this.product_type) return next();

  if (this.product_type === "MANUFACTURED") {
    const factories = Array.isArray(this.factory_ids)
      ? this.factory_ids.filter((id) => id != null)
      : [];
    if (!factories.length) {
      return next(new Error("At least one factory is required for MANUFACTURED products"));
    }
    if (!MANUFACTURED_UNITS.includes(this.unit)) {
      return next(new Error("MANUFACTURED products must use BAG/BOX/CASE/CTN/JAR/POUCH units"));
    }
    if (this.db_price == null || this.mrp == null || this.ctn_pcs == null) {
      return next(new Error("db_price, mrp and ctn_pcs are required for MANUFACTURED products"));
    }
    this.factory_ids = factories;
  } else if (this.product_type === "PROCURED") {
    if (!PROCURED_UNITS.includes(this.unit)) {
      return next(new Error("PROCURED products must use PCS unit"));
    }
    assignNullsForProcured(this);
  }

  next();
});

productSchema.pre("save", function (next) {
  this.updated_at = new Date();
  if (!this.created_at) {
    this.created_at = new Date();
  }
  next();
});

productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const set = update.$set || {};

  if (set.product_type) {
    set.product_type = set.product_type.toUpperCase();
  }
  if (set.unit) {
    set.unit = set.unit.toUpperCase();
  }
  if (set.factory_ids) {
    const factories = Array.isArray(set.factory_ids)
      ? set.factory_ids.filter(Boolean)
      : [set.factory_ids].filter(Boolean);
    set.factory_ids = factories;
  }
  set.updated_at = new Date();
  update.$set = set;
  this.setUpdate(update);
  next();
});

productSchema.statics.PRODUCT_TYPES = PRODUCT_TYPES;
productSchema.statics.PRODUCT_UNITS = PRODUCT_UNITS;
productSchema.statics.MANUFACTURED_UNITS = MANUFACTURED_UNITS;
productSchema.statics.PROCURED_UNITS = PROCURED_UNITS;

module.exports = mongoose.model("Product", productSchema);
