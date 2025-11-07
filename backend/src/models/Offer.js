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
  "FLASH_SALE",
];

const OFFER_STATUS = ["draft", "active", "paused", "expired", "completed"];
const PRODUCT_SEGMENTS = ["BIS", "BEV"];

const territorySelectionSchema = new mongoose.Schema(
  {
    ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Territory" }],
    mode: { type: String, enum: ["include", "exclude"], default: "include" },
  },
  { _id: false }
);

const distributorSelectionSchema = new mongoose.Schema(
  {
    ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Distributor" }],
    mode: { type: String, enum: ["include", "exclude"], default: "include" },
  },
  { _id: false }
);

const discountSlabSchema = new mongoose.Schema(
  {
    minValue: { type: Number, required: true, min: 0 },
    maxValue: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, min: 0, max: 100 },
    discountAmount: { type: Number, min: 0 },
  },
  { _id: false }
);

const volumeSlabSchema = new mongoose.Schema(
  {
    minQuantity: { type: Number, required: true, min: 0 },
    maxQuantity: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const buyProductSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const getProductSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    discountPercentage: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const offerSchema = new mongoose.Schema(
  {
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
      db_points: territorySelectionSchema,
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
      firstOrderOnly: { type: Boolean, default: false },
    },

    stats: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalDiscount: { type: Number, default: 0 },
      uniqueDistributors: { type: Number, default: 0 },
    },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approved_at: { type: Date },
    description: { type: String, trim: true },
    internal_notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

offerSchema.index({ offer_type: 1, status: 1, active: 1 });
offerSchema.index({ start_date: 1, end_date: 1 });
offerSchema.index({ createdAt: -1 });

offerSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return this.active && this.status === "active" && this.start_date <= now && this.end_date >= now;
});

offerSchema.virtual("hasExpired").get(function () {
  return this.end_date < new Date();
});

/**
 * Instance method to check if a distributor is eligible for this offer
 * @param {Object} distributor - Distributor document with db_point_id and product_segment
 * @returns {Boolean}
 */
offerSchema.methods.isDistributorEligible = function (distributor) {
  // Check product segment eligibility
  if (!this.product_segments || this.product_segments.length === 0) {
    return false;
  }

  const hasMatchingSegment = distributor.product_segment.some((seg) =>
    this.product_segments.includes(seg)
  );

  if (!hasMatchingSegment) {
    return false;
  }

  // Check specific distributor inclusion/exclusion
  if (this.distributors?.ids && this.distributors.ids.length > 0) {
    const distributorIdString = distributor._id.toString();
    const isInList = this.distributors.ids.some((id) => id.toString() === distributorIdString);

    if (this.distributors.mode === "exclude") {
      return !isInList; // Not in exclusion list
    } else {
      return isInList; // In inclusion list
    }
  }

  // If no specific distributors specified, eligible based on territory/segment
  return true;
};

/**
 * Static method to find offers eligible for a specific distributor
 * @param {ObjectId} distributorId - Distributor ID
 * @returns {Array} Array of eligible offers
 */
offerSchema.statics.findEligibleForDistributor = async function (distributorId) {
  const Distributor = mongoose.model("Distributor");
  const Territory = mongoose.model("Territory");

  const distributor = await Distributor.findById(distributorId).populate("db_point_id").lean();

  if (!distributor) {
    throw new Error("Distributor not found");
  }

  console.log("🔍 Distributor product_segment:", distributor.product_segment);

  const now = new Date();

  // Find active offers
  const offers = await this.find({
    active: true,
    status: "active",
    start_date: { $lte: now },
    end_date: { $gte: now },
    product_segments: { $in: distributor.product_segment },
  }).lean();

  console.log("🔍 Found active offers matching segment:", offers.length);

  // Filter by territory and distributor eligibility
  const eligibleOffers = [];

  for (const offer of offers) {
    console.log(`\n🔍 Checking offer: ${offer.name}`);
    console.log(`   Distributors:`, offer.distributors);

    // Check specific distributor inclusion/exclusion
    if (offer.distributors?.ids && offer.distributors.ids.length > 0) {
      // Use distributor._id instead of distributorId (which got overwritten)
      const distributorIdString = distributor._id.toString();
      const isInList = offer.distributors.ids.some((id) => id.toString() === distributorIdString);

      console.log(`   Distributor._id string:`, distributorIdString);
      console.log(
        `   Offer distributor IDs:`,
        offer.distributors.ids.map((id) => id.toString())
      );
      console.log(`   IsInList: ${isInList}, Mode: ${offer.distributors.mode}`);

      if (offer.distributors.mode === "exclude" && isInList) {
        console.log(`   ❌ SKIPPED: Distributor excluded`);
        continue; // Excluded
      }
      if (offer.distributors.mode === "include" && !isInList) {
        console.log(`   ❌ SKIPPED: Distributor not in include list`);
        continue; // Not included
      }
    }

    // Check territory eligibility
    const { territories } = offer;
    if (territories) {
      const territoryIds = [
        ...(territories.zones?.ids || []),
        ...(territories.regions?.ids || []),
        ...(territories.areas?.ids || []),
        ...(territories.db_points?.ids || []),
      ];

      if (territoryIds.length > 0) {
        // Check if distributor's DB point or its ancestors match
        const dbPoint = distributor.db_point_id;
        const dbPointIdStr = dbPoint._id.toString();
        const parentIdStr = dbPoint.parent_id ? dbPoint.parent_id.toString() : null;

        const isInTerritory = territoryIds.some((id) => {
          const idStr = id.toString();
          return (
            idStr === dbPointIdStr ||
            idStr === parentIdStr ||
            (dbPoint.ancestors && dbPoint.ancestors.some((aid) => aid.toString() === idStr))
          );
        });

        // Check mode
        if (
          territories.zones?.mode === "exclude" ||
          territories.regions?.mode === "exclude" ||
          territories.areas?.mode === "exclude" ||
          territories.db_points?.mode === "exclude"
        ) {
          if (isInTerritory) continue; // Excluded
        } else {
          if (!isInTerritory) continue; // Not included
        }
      }
    }

    eligibleOffers.push(offer);
  }

  return eligibleOffers;
};

// Delete existing model if it exists and create fresh one
delete mongoose.connection.models["Offer"];
const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;
