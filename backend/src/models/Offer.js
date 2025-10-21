const mongoose = require("mongoose");

const OFFER_TYPES = [
  "FLAT_DISCOUNT_PCT",
  "FLAT_DISCOUNT_AMT",
  "DISCOUNT_SLAB_PCT",
  "DISCOUNT_SLAB_AMT",
  "FREE_PRODUCT",
  "BUNDLE_OFFER",
  "BOGO",
  "CASHBACK",
  "VOLUME_DISCOUNT",
  "CROSS_CATEGORY",
  "FIRST_ORDER",
  "LOYALTY_POINTS",
  "FLASH_SALE"
];

const OFFER_STATUS = ["draft", "active", "paused", "expired", "completed"];
const PRODUCT_SEGMENTS = ["BIS", "BEV"];

const territorySelectionSchema = new mongoose.Schema({
  ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Territory" }],
  mode: { type: String, enum: ["include", "exclude"], default: "include" }
}, { _id: false });

const distributorSelectionSchema = new mongoose.Schema({
  ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Distributor" }],
  mode: { type: String, enum: ["include", "exclude"], default: "include" }
}, { _id: false });

const discountSlabSchema = new mongoose.Schema({
  minValue: { type: Number, required: true, min: 0 },
  maxValue: { type: Number, required: true, min: 0 },
  discountPercentage: { type: Number, min: 0, max: 100 },
  discountAmount: { type: Number, min: 0 }
}, { _id: false });

const volumeSlabSchema = new mongoose.Schema({
  minQuantity: { type: Number, required: true, min: 0 },
  maxQuantity: { type: Number, required: true, min: 0 },
  discountPercentage: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const buyProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const getProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  discountPercentage: { type: Number, min: 0, max: 100 }
}, { _id: false });

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, index: true },
  offer_type: { type: String, enum: OFFER_TYPES, required: true, index: true },
  product_segments: [{ type: String, enum: PRODUCT_SEGMENTS, required: true }],
  start_date: { type: Date, required: true, index: true },
  end_date: { type: Date, required: true, index: true },
  status: { type: String, enum: OFFER_STATUS, default: "draft", index: true },
  active: { type: Boolean, default: true, index: true },
  
  territories: {
    zones: territorySelectionSchema,
    regions: territorySelectionSchema,
    areas: territorySelectionSchema,
    db_points: territorySelectionSchema
  },
  
  distributors: distributorSelectionSchema,
  
  config: {
    selectedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applyToAllProducts: { type: Boolean, default: false },
    discountPercentage: { type: Number, min: 0, max: 100 },
    discountAmount: { type: Number, min: 0 },
    minOrderValue: { type: Number, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    slabs: [discountSlabSchema],
    volumeSlabs: [volumeSlabSchema],
    buyProducts: [buyProductSchema],
    getProducts: [getProductSchema],
    cashbackPercentage: { type: Number, min: 0, max: 100 },
    cashbackAmount: { type: Number, min: 0 },
    maxCashback: { type: Number, min: 0 },
    pointsPerUnit: { type: Number, min: 0 },
    pointsValue: { type: Number, min: 0 },
    stockLimit: { type: Number, min: 0 },
    orderLimit: { type: Number, min: 0 },
    requiredCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    minCategoriesRequired: { type: Number, min: 1 },
    firstOrderOnly: { type: Boolean, default: false }
  },
  
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    uniqueDistributors: { type: Number, default: 0 }
  },
  
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approved_at: { type: Date },
  description: { type: String, trim: true },
  internal_notes: { type: String, trim: true }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

offerSchema.index({ offer_type: 1, status: 1, active: 1 });
offerSchema.index({ start_date: 1, end_date: 1 });
offerSchema.index({ createdAt: -1 });

offerSchema.virtual("isCurrentlyActive").get(function() {
  const now = new Date();
  return this.active && this.status === "active" && this.start_date <= now && this.end_date >= now;
});

offerSchema.virtual("hasExpired").get(function() {
  return this.end_date < new Date();
});

// Delete existing model if it exists and create fresh one
delete mongoose.connection.models['Offer'];
const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;
