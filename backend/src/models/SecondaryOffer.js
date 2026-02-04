const mongoose = require("mongoose");

const OFFER_TYPES = [
  "FLAT_DISCOUNT_PCT",
  "FLAT_DISCOUNT_AMT",
  "DISCOUNT_SLAB_PCT",
  "DISCOUNT_SLAB_AMT",
  "SKU_DISCOUNT_AMOUNT",
  "FREE_PRODUCT",
  "BUNDLE_OFFER",
  "BOGO",
  "BOGO_DIFFERENT_SKU",
  "CASHBACK",
  "VOLUME_DISCOUNT",
  "CROSS_CATEGORY",
  "FIRST_ORDER",
  "LOYALTY_POINTS",
  "FLASH_SALE",
];

const OFFER_STATUS = ["Draft", "Active", "Paused", "Expired", "Completed"];
const PRODUCT_SEGMENTS = ["BIS", "BEV"];
const OUTLET_SELECTION_MODES = ["all", "specific", "filtered"];

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
    applyToAllRoutes: { type: Boolean, default: true },
  },
  { _id: false }
);

const routeSelectionSchema = new mongoose.Schema(
  {
    ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Route" }],
    mode: { type: String, enum: ["include", "exclude"], default: "include" },
    applyToAllOutlets: { type: Boolean, default: true },
  },
  { _id: false }
);

const outletFiltersSchema = new mongoose.Schema(
  {
    outletTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: "OutletType" }],
    channels: [{ type: mongoose.Schema.Types.ObjectId, ref: "OutletChannel" }],
    minMarketSize: { type: Number, min: 0 },
    maxMarketSize: { type: Number, min: 0 },
  },
  { _id: false }
);

const outletSelectionSchema = new mongoose.Schema(
  {
    selectionMode: { type: String, enum: OUTLET_SELECTION_MODES, default: "all" },
    ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "Outlet" }],
    mode: { type: String, enum: ["include", "exclude"], default: "include" },
    filters: outletFiltersSchema,
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
    isPromotionalGift: { type: Boolean, default: false },
  },
  { _id: false }
);

const qualifierProductSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    minQuantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const rewardProductSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    freeQuantity: { type: Number, required: true, min: 1 },
    maxValueCap: { type: Number, min: 0 },
  },
  { _id: false }
);

const skuDiscountSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    discountAmount: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { _id: false }
);

const secondaryOfferSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    offer_type: { type: String, enum: OFFER_TYPES, required: true, index: true },
    product_segments: [{ type: String, enum: PRODUCT_SEGMENTS, required: true }],
    start_date: { type: Date, required: true, index: true },
    end_date: { type: Date, required: true, index: true },
    status: { type: String, enum: OFFER_STATUS, default: "Draft", index: true },
    active: { type: Boolean, default: true, index: true },

    // Territory targeting (same as Primary Offers)
    territories: {
      zones: territorySelectionSchema,
      regions: territorySelectionSchema,
      areas: territorySelectionSchema,
      db_points: territorySelectionSchema,
    },

    // NEW: Distributor and Route targeting
    targeting: {
      distributors: distributorSelectionSchema,
      routes: routeSelectionSchema,
    },

    // NEW: Outlet targeting (final target for Secondary Offers)
    outlets: outletSelectionSchema,

    // Offer configuration (same as Primary Offers)
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
      bundlePrice: { type: Number, min: 0 },
      buyQuantity: { type: Number, min: 1, default: 1 },
      getQuantity: { type: Number, min: 1, default: 1 },
      skuDiscounts: [skuDiscountSchema],
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
      qualifierProducts: [qualifierProductSchema],
      rewardProducts: [rewardProductSchema],
      qualifierLogic: { type: String, enum: ["AND", "OR"], default: "AND" },
      distributionMode: { type: String, enum: ["all", "choice"], default: "all" },
      allowRepetition: { type: Boolean, default: false },
      maxRewardSets: { type: Number, min: 1 },
    },

    // Cached outlet IDs for performance (calculated during save)
    resolvedOutlets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Outlet" }],

    stats: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalDiscount: { type: Number, default: 0 },
      uniqueOutlets: { type: Number, default: 0 },
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

// Indexes
secondaryOfferSchema.index({ offer_type: 1, status: 1, active: 1 });
secondaryOfferSchema.index({ start_date: 1, end_date: 1 });
secondaryOfferSchema.index({ createdAt: -1 });
secondaryOfferSchema.index({ resolvedOutlets: 1 });

// Virtuals
secondaryOfferSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date();
  return this.active && this.status === "Active" && this.start_date <= now && this.end_date >= now;
});

secondaryOfferSchema.virtual("hasExpired").get(function () {
  return this.end_date < new Date();
});

/**
 * Pre-save hook to resolve and cache outlet IDs
 */
secondaryOfferSchema.pre("save", async function (next) {
  if (
    this.isModified("territories") ||
    this.isModified("targeting") ||
    this.isModified("outlets")
  ) {
    try {
      this.resolvedOutlets = await this.constructor.resolveTargetedOutlets(this);
    } catch (error) {
      console.error("Error resolving outlets:", error);
      // Continue anyway - can recalculate later
    }
  }
  next();
});

/**
 * Static method to resolve targeted outlets from offer scope
 */
secondaryOfferSchema.statics.resolveTargetedOutlets = async function (offerScope) {
  const Outlet = mongoose.model("Outlet");
  const Territory = mongoose.model("Territory");
  const Route = mongoose.model("Route");
  const Distributor = mongoose.model("Distributor");

  let query = { active: true };
  let eligibleRouteIds = null; // Track which routes are eligible

  // Step 1: Filter by territories if any selected
  const hasTerritory =
    offerScope.territories?.zones?.ids?.length > 0 ||
    offerScope.territories?.regions?.ids?.length > 0 ||
    offerScope.territories?.areas?.ids?.length > 0 ||
    offerScope.territories?.db_points?.ids?.length > 0;

  if (hasTerritory) {
    const dbPointIds = [];

    // Collect DB points from all territory levels
    if (offerScope.territories.db_points?.ids?.length > 0) {
      dbPointIds.push(...offerScope.territories.db_points.ids);
    }

    // Get DB points under selected areas
    if (offerScope.territories.areas?.ids?.length > 0) {
      const areaDbPoints = await Territory.find({
        type: "db_point",
        parent_id: { $in: offerScope.territories.areas.ids },
        active: true,
      }).distinct("_id");
      dbPointIds.push(...areaDbPoints);
    }

    // Get DB points under selected regions (via areas)
    if (offerScope.territories.regions?.ids?.length > 0) {
      const regionAreas = await Territory.find({
        type: "area",
        parent_id: { $in: offerScope.territories.regions.ids },
        active: true,
      }).distinct("_id");

      const regionDbPoints = await Territory.find({
        type: "db_point",
        parent_id: { $in: regionAreas },
        active: true,
      }).distinct("_id");
      dbPointIds.push(...regionDbPoints);
    }

    // Get DB points under selected zones (via regions > areas)
    if (offerScope.territories.zones?.ids?.length > 0) {
      const zoneRegions = await Territory.find({
        type: "region",
        parent_id: { $in: offerScope.territories.zones.ids },
        active: true,
      }).distinct("_id");

      const zoneAreas = await Territory.find({
        type: "area",
        parent_id: { $in: zoneRegions },
        active: true,
      }).distinct("_id");

      const zoneDbPoints = await Territory.find({
        type: "db_point",
        parent_id: { $in: zoneAreas },
        active: true,
      }).distinct("_id");
      dbPointIds.push(...zoneDbPoints);
    }

    // Get distributors under these DB points, then get their routes
    if (dbPointIds.length > 0) {
      const distributorsByTerritory = await Distributor.find({
        db_point_id: { $in: dbPointIds },
        active: true,
      }).distinct("_id");

      if (distributorsByTerritory.length > 0) {
        const routesByTerritory = await Route.find({
          distributor_id: { $in: distributorsByTerritory },
          active: true,
        }).distinct("_id");
        eligibleRouteIds = new Set(routesByTerritory.map((id) => id.toString()));
      } else {
        // No distributors in these territories means no routes
        eligibleRouteIds = new Set();
      }
    }
  }

  // Step 2: Filter by distributors if specified
  if (offerScope.targeting?.distributors?.ids?.length > 0) {
    const mode = offerScope.targeting.distributors.mode;
    const routesByDistributor = await Route.find({
      distributor_id: {
        [mode === "include" ? "$in" : "$nin"]: offerScope.targeting.distributors.ids,
      },
      active: true,
    }).distinct("_id");

    const routeIdsByDistributor = new Set(routesByDistributor.map((id) => id.toString()));

    // Intersect with territory-filtered routes if applicable
    if (eligibleRouteIds !== null) {
      eligibleRouteIds = new Set(
        [...eligibleRouteIds].filter((id) => routeIdsByDistributor.has(id))
      );
    } else {
      eligibleRouteIds = routeIdsByDistributor;
    }
  }

  // Step 3: Filter by routes if specified
  if (offerScope.targeting?.routes?.ids?.length > 0) {
    const mode = offerScope.targeting.routes.mode;
    const routeIdsBySelection = new Set(offerScope.targeting.routes.ids.map((id) => id.toString()));

    if (mode === "include") {
      // Intersect with previously filtered routes
      if (eligibleRouteIds !== null) {
        eligibleRouteIds = new Set(
          [...eligibleRouteIds].filter((id) => routeIdsBySelection.has(id))
        );
      } else {
        eligibleRouteIds = routeIdsBySelection;
      }
    } else {
      // Exclude specific routes
      if (eligibleRouteIds !== null) {
        routeIdsBySelection.forEach((id) => eligibleRouteIds.delete(id));
      } else {
        // Get all routes except excluded ones
        const allRoutes = await Route.find({ active: true }).distinct("_id");
        eligibleRouteIds = new Set(
          allRoutes.map((id) => id.toString()).filter((id) => !routeIdsBySelection.has(id))
        );
      }
    }
  }

  // Apply route filter to outlet query
  if (eligibleRouteIds !== null && eligibleRouteIds.size > 0) {
    query["route_id"] = {
      $in: Array.from(eligibleRouteIds).map((id) => new mongoose.Types.ObjectId(id)),
    };
  } else if (eligibleRouteIds !== null && eligibleRouteIds.size === 0) {
    // No eligible routes means no outlets
    return [];
  }

  // Get base outlets
  let outlets = await Outlet.find(query).select("_id outlet_type_id channel_id").lean();
  let outletIds = new Set(outlets.map((o) => o._id.toString()));

  // Step 4: Apply outlet-level selection
  if (offerScope.outlets?.selectionMode === "specific") {
    if (offerScope.outlets.mode === "include") {
      outletIds = new Set(offerScope.outlets.ids.map((id) => id.toString()));
    } else {
      offerScope.outlets.ids.forEach((id) => outletIds.delete(id.toString()));
    }
  } else if (offerScope.outlets?.selectionMode === "filtered") {
    const filters = {};

    if (offerScope.outlets.filters?.outletTypes?.length > 0) {
      filters.outlet_type_id = { $in: offerScope.outlets.filters.outletTypes };
    }

    if (offerScope.outlets.filters?.channels?.length > 0) {
      filters.channel_id = { $in: offerScope.outlets.filters.channels };
    }

    const filtered = await Outlet.find({
      _id: { $in: Array.from(outletIds).map((id) => new mongoose.Types.ObjectId(id)) },
      ...filters,
    }).select("_id");

    outletIds = new Set(filtered.map((o) => o._id.toString()));
  }

  return Array.from(outletIds).map((id) => new mongoose.Types.ObjectId(id));
};

/**
 * Instance method to check if an outlet is eligible for this offer
 */
secondaryOfferSchema.methods.isOutletEligible = function (outletId) {
  return this.resolvedOutlets.some((id) => id.toString() === outletId.toString());
};

/**
 * Static method to find offers eligible for a specific outlet
 * Used when SO sells from distributor stock to outlets
 */
secondaryOfferSchema.statics.findEligibleForOutlet = async function (
  outletId,
  productSegment = null,
  distributorId = null
) {
  const now = new Date();

  const query = {
    active: true,
    status: "Active",
    start_date: { $lte: now },
    end_date: { $gte: now },
    resolvedOutlets: outletId,
  };

  if (productSegment) {
    query.product_segments = productSegment;
  }

  // If distributorId provided, verify the outlet's distributor is eligible
  if (distributorId) {
    const Outlet = mongoose.model("Outlet");
    const outlet = await Outlet.findById(outletId).populate("route_id").lean();
    if (
      outlet &&
      outlet.route_id &&
      outlet.route_id.distributor_id.toString() !== distributorId.toString()
    ) {
      // Outlet doesn't belong to this distributor, no offers available
      return [];
    }
  }

  return this.find(query).lean();
};

/**
 * Instance method to check if offer applies to a specific distributor's stock
 * Used to validate stock availability before applying offer
 * Secondary offers always apply to distributor stock by definition
 */
secondaryOfferSchema.methods.appliesToDistributor = function (distributorId) {
  // Check if any of the resolved outlets belong to this distributor
  // This will be validated at order creation time by checking outlet.route_id.distributor_id
  return true;
};

module.exports = mongoose.model("SecondaryOffer", secondaryOfferSchema);
