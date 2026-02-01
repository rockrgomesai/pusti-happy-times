const express = require("express");
const { query, body, param, validationResult } = require("express-validator");
const {
  Territory,
  Distributor,
  Product,
  Category,
  Route,
  Outlet,
  OutletType,
  OutletChannel,
} = require("../../models");
const SecondaryOffer = require("../../models/SecondaryOffer");
const { requireApiPermission } = require("../../middleware/auth");

const router = express.Router();

// =====================
// OUTLET RESOLUTION ROUTES
// =====================

/**
 * POST /product/secondaryoffers/outlets/resolve
 * Resolve targeted outlets based on offer scope
 */
router.post(
  "/outlets/resolve",
  requireApiPermission("secondary-offers:read"),
  [
    body("territories").optional().isObject(),
    body("targeting").optional().isObject(),
    body("outlets").optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const offerScope = req.body;

      // Use the model's static method to resolve outlets
      const outletIds = await SecondaryOffer.resolveTargetedOutlets(offerScope);

      // Get outlet details for preview
      const outlets = await Outlet.find({ _id: { $in: outletIds } })
        .select("outlet_id outlet_name route_id outlet_type_id channel_id")
        .populate("route_id", "route_id route_name distributor_id")
        .populate({
          path: "route_id",
          populate: {
            path: "distributor_id",
            select: "name distributor_id",
          },
        })
        .limit(100) // Preview limit
        .lean();

      res.json({
        success: true,
        data: {
          totalOutlets: outletIds.length,
          outlets,
          outletIds,
        },
      });
    } catch (error) {
      console.error("Error resolving outlets:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resolve outlets",
        error: error.message,
      });
    }
  }
);

/**
 * POST /product/secondaryoffers/routes/eligible
 * Get eligible routes filtered by distributors
 */
router.post(
  "/routes/eligible",
  requireApiPermission("secondary-offers:read"),
  [
    body("distributorIds").isArray({ min: 1 }).withMessage("At least one distributor required"),
    body("distributorIds.*").isMongoId().withMessage("Invalid distributor ID"),
    body("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
  ],
  async (req, res) => {
    try {
      console.log("📍 [ROUTES] Request received:", { body: req.body });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ [ROUTES] Validation failed:", errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { distributorIds, limit } = req.body;
      console.log("🔍 [ROUTES] Fetching routes for distributors:", distributorIds);

      const query = Route.find({
        distributor_id: { $in: distributorIds },
        active: true,
      })
        .select("_id route_id route_name distributor_id area_id")
        .populate("distributor_id", "name distributor_id")
        .populate("area_id", "name territory_id")
        .sort({ route_name: 1 });

      if (limit) {
        query.limit(limit);
      }

      const routes = await query.lean();
      console.log("✅ [ROUTES] Found routes:", routes.length);

      res.json({
        success: true,
        data: routes,
        count: routes.length,
      });
    } catch (error) {
      console.error("💥 [ROUTES] Error fetching eligible routes:", error);
      console.error("💥 [ROUTES] Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Failed to fetch eligible routes",
        error: error.message,
      });
    }
  }
);

/**
 * GET /product/secondaryoffers/outlet-types
 * Get all outlet types for filtering
 */
router.get("/outlet-types", requireApiPermission("secondary-offers:read"), async (req, res) => {
  try {
    const outletTypes = await OutletType.find({ active: true })
      .select("_id name description")
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: outletTypes,
    });
  } catch (error) {
    console.error("Error fetching outlet types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch outlet types",
      error: error.message,
    });
  }
});

/**
 * GET /product/secondaryoffers/outlet-channels
 * Get all outlet channels for filtering
 */
router.get("/outlet-channels", requireApiPermission("secondary-offers:read"), async (req, res) => {
  try {
    const channels = await OutletChannel.find({ active: true })
      .select("_id name description")
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: channels,
    });
  } catch (error) {
    console.error("Error fetching outlet channels:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch outlet channels",
      error: error.message,
    });
  }
});

// =====================
// SECONDARY OFFER CRUD ROUTES
// =====================

/**
 * POST /product/secondaryoffers
 * Create a new secondary offer
 */
router.post(
  "/",
  requireApiPermission("secondary-offers:create"),
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Offer name is required")
      .isLength({ max: 200 })
      .withMessage("Offer name must be less than 200 characters"),
    body("offer_type")
      .isIn([
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
      ])
      .withMessage("Invalid offer type"),
    body("product_segments")
      .isArray({ min: 1 })
      .withMessage("At least one product segment is required"),
    body("product_segments.*").isIn(["BIS", "BEV"]).withMessage("Invalid product segment"),
    body("start_date").isISO8601().withMessage("Valid start date is required"),
    body("end_date")
      .isISO8601()
      .withMessage("Valid end date is required")
      .custom((endDate, { req }) => {
        if (new Date(endDate) <= new Date(req.body.start_date)) {
          throw new Error("End date must be after start date");
        }
        return true;
      }),
    body("status")
      .optional()
      .isIn(["Draft", "Active", "Paused", "Expired", "Completed"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        name,
        offer_type,
        product_segments,
        start_date,
        end_date,
        territories,
        targeting,
        outlets,
        config,
        status,
        active,
        description,
        internal_notes,
      } = req.body;

      // Validate territories if provided
      if (territories) {
        const allTerritoryIds = [
          ...(territories.zones?.ids || []),
          ...(territories.regions?.ids || []),
          ...(territories.areas?.ids || []),
          ...(territories.db_points?.ids || []),
        ];

        if (allTerritoryIds.length > 0) {
          const validTerritories = await Territory.countDocuments({
            _id: { $in: allTerritoryIds },
            active: true,
          });

          if (validTerritories !== allTerritoryIds.length) {
            return res.status(400).json({
              success: false,
              message: "Some selected territories are invalid or inactive",
            });
          }
        }
      }

      // Validate distributors if provided
      if (targeting?.distributors?.ids && targeting.distributors.ids.length > 0) {
        const validDistributors = await Distributor.countDocuments({
          _id: { $in: targeting.distributors.ids },
          active: true,
        });

        if (validDistributors !== targeting.distributors.ids.length) {
          return res.status(400).json({
            success: false,
            message: "Some selected distributors are invalid or inactive",
          });
        }
      }

      // Validate routes if provided
      if (targeting?.routes?.ids && targeting.routes.ids.length > 0) {
        const validRoutes = await Route.countDocuments({
          _id: { $in: targeting.routes.ids },
          active: true,
        });

        if (validRoutes !== targeting.routes.ids.length) {
          return res.status(400).json({
            success: false,
            message: "Some selected routes are invalid or inactive",
          });
        }
      }

      // Validate outlets if specific selection
      if (outlets?.selectionMode === "specific" && outlets.ids?.length > 0) {
        const validOutlets = await Outlet.countDocuments({
          _id: { $in: outlets.ids },
          active: true,
        });

        if (validOutlets !== outlets.ids.length) {
          return res.status(400).json({
            success: false,
            message: "Some selected outlets are invalid or inactive",
          });
        }
      }

      // Create the offer
      const offer = new SecondaryOffer({
        name,
        offer_type,
        product_segments,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        status: status || "Draft",
        active: active !== undefined ? active : true,
        territories: territories || {
          zones: { ids: [], mode: "include" },
          regions: { ids: [], mode: "include" },
          areas: { ids: [], mode: "include" },
          db_points: { ids: [], mode: "include" },
        },
        targeting: targeting || {
          distributors: { ids: [], mode: "include", applyToAllRoutes: true },
          routes: { ids: [], mode: "include", applyToAllOutlets: true },
        },
        outlets: outlets || {
          selectionMode: "all",
          ids: [],
          mode: "include",
          filters: {},
        },
        config: config || {},
        description,
        internal_notes,
        created_by: req.user._id,
        updated_by: req.user._id,
      });

      await offer.save();

      // Populate references for response
      await offer.populate([
        {
          path: "config.selectedProducts",
          select: "sku bangla_name unit db_price",
          strictPopulate: false,
        },
        { path: "territories.zones.ids", select: "name type level", strictPopulate: false },
        { path: "territories.regions.ids", select: "name type level", strictPopulate: false },
        { path: "territories.areas.ids", select: "name type level", strictPopulate: false },
        { path: "territories.db_points.ids", select: "name type level", strictPopulate: false },
        {
          path: "targeting.distributors.ids",
          select: "name distributor_id",
          strictPopulate: false,
        },
        { path: "targeting.routes.ids", select: "route_id route_name", strictPopulate: false },
        { path: "created_by", select: "name email", strictPopulate: false },
      ]);

      res.status(201).json({
        success: true,
        message: "Secondary offer created successfully",
        data: offer,
      });
    } catch (error) {
      console.error("Error creating secondary offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create secondary offer",
        error: error.message,
      });
    }
  }
);

/**
 * GET /product/secondaryoffers
 * Get all secondary offers with filtering and pagination
 */
router.get(
  "/",
  requireApiPermission("secondary-offers:read"),
  [
    query("status")
      .optional()
      .isIn(["Draft", "Active", "Paused", "Expired", "Completed"])
      .withMessage("Invalid status filter"),
    query("offer_type").optional().isString(),
    query("active").optional().isBoolean().withMessage("Active must be boolean"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { status, offer_type, active, page, limit, search } = req.query;

      // Build filter
      const filter = {};

      if (status) filter.status = status;
      if (offer_type) filter.offer_type = offer_type;
      if (active !== undefined) filter.active = active === "true";
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      let query = SecondaryOffer.find(filter)
        .select("-internal_notes")
        .populate({
          path: "config.selectedProducts",
          select: "sku bangla_name unit",
          strictPopulate: false,
        })
        .populate({ path: "created_by", select: "name email", strictPopulate: false })
        .sort({ createdAt: -1 });

      // Apply pagination if limit provided
      if (limit) {
        const skip = (parseInt(page || 1) - 1) * parseInt(limit);
        query = query.skip(skip).limit(parseInt(limit));
      }

      const [offers, total] = await Promise.all([
        query.lean(),
        SecondaryOffer.countDocuments(filter),
      ]);

      const response = {
        success: true,
        data: offers,
        total,
      };

      if (limit) {
        response.pagination = {
          page: parseInt(page || 1),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        };
      }

      res.json(response);
    } catch (error) {
      console.error("Error fetching secondary offers:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch secondary offers",
        error: error.message,
      });
    }
  }
);

/**
 * GET /product/secondaryoffers/:id
 * Get secondary offer by ID
 */
router.get(
  "/:id",
  requireApiPermission("secondary-offers:read"),
  [param("id").isMongoId().withMessage("Invalid offer ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const offer = await SecondaryOffer.findById(req.params.id)
        .populate({
          path: "config.selectedProducts",
          select: "sku bangla_name unit db_price mrp",
          strictPopulate: false,
        })
        .populate({
          path: "territories.zones.ids",
          select: "name type level",
          strictPopulate: false,
        })
        .populate({
          path: "territories.regions.ids",
          select: "name type level",
          strictPopulate: false,
        })
        .populate({
          path: "territories.areas.ids",
          select: "name type level",
          strictPopulate: false,
        })
        .populate({
          path: "territories.db_points.ids",
          select: "name type level",
          strictPopulate: false,
        })
        .populate({
          path: "targeting.distributors.ids",
          select: "name distributor_id",
          strictPopulate: false,
        })
        .populate({
          path: "targeting.routes.ids",
          select: "route_id route_name",
          strictPopulate: false,
        })
        .populate({ path: "created_by", select: "name email", strictPopulate: false })
        .populate({ path: "updated_by", select: "name email", strictPopulate: false })
        .populate({ path: "approved_by", select: "name email", strictPopulate: false })
        .lean();

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Secondary offer not found",
        });
      }

      res.json({
        success: true,
        data: offer,
      });
    } catch (error) {
      console.error("Error fetching secondary offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch secondary offer",
        error: error.message,
      });
    }
  }
);

/**
 * PUT /product/secondaryoffers/:id
 * Update secondary offer
 */
router.put(
  "/:id",
  requireApiPermission("secondary-offers:update"),
  [
    param("id").isMongoId().withMessage("Invalid offer ID"),
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("offer_type").optional().isString(),
    body("start_date").optional().isISO8601().withMessage("Invalid start date"),
    body("end_date").optional().isISO8601().withMessage("Invalid end date"),
    body("status")
      .optional()
      .isIn(["Draft", "Active", "Paused", "Expired", "Completed"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const updateData = { ...req.body };
      updateData.updated_by = req.user._id;

      // Validate dates
      if (updateData.end_date && updateData.start_date) {
        if (new Date(updateData.end_date) <= new Date(updateData.start_date)) {
          return res.status(400).json({
            success: false,
            message: "End date must be after start date",
          });
        }
      }

      // Validate territories if provided
      if (updateData.territories) {
        const allTerritoryIds = [
          ...(updateData.territories.zones?.ids || []),
          ...(updateData.territories.regions?.ids || []),
          ...(updateData.territories.areas?.ids || []),
          ...(updateData.territories.db_points?.ids || []),
        ];

        if (allTerritoryIds.length > 0) {
          const validTerritories = await Territory.countDocuments({
            _id: { $in: allTerritoryIds },
            active: true,
          });

          if (validTerritories !== allTerritoryIds.length) {
            return res.status(400).json({
              success: false,
              message: "Some selected territories are invalid or inactive",
            });
          }
        }
      }

      const offer = await SecondaryOffer.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate({
          path: "config.selectedProducts",
          select: "sku bangla_name unit db_price",
          strictPopulate: false,
        })
        .populate({ path: "created_by", select: "name email", strictPopulate: false })
        .populate({ path: "updated_by", select: "name email", strictPopulate: false })
        .lean();

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Secondary offer not found",
        });
      }

      res.json({
        success: true,
        data: offer,
        message: "Secondary offer updated successfully",
      });
    } catch (error) {
      console.error("Error updating secondary offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update secondary offer",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /product/secondaryoffers/:id
 * Delete secondary offer (soft delete)
 */
router.delete(
  "/:id",
  requireApiPermission("secondary-offers:delete"),
  [param("id").isMongoId().withMessage("Invalid offer ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;

      const offer = await SecondaryOffer.findByIdAndUpdate(
        id,
        {
          status: "Completed",
          active: false,
          updated_by: req.user._id,
        },
        { new: true }
      ).lean();

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Secondary offer not found",
        });
      }

      res.json({
        success: true,
        data: offer,
        message: "Secondary offer deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting secondary offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete secondary offer",
        error: error.message,
      });
    }
  }
);

/**
 * PATCH /product/secondaryoffers/:id/status
 * Toggle secondary offer active status
 */
router.patch(
  "/:id/status",
  requireApiPermission("secondary-offers:update"),
  [
    param("id").isMongoId().withMessage("Invalid offer ID"),
    body("active").isBoolean().withMessage("Active must be boolean"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { active } = req.body;

      const offer = await SecondaryOffer.findByIdAndUpdate(
        id,
        {
          active,
          updated_by: req.user._id,
          ...(active === false && { status: "Paused" }),
        },
        { new: true }
      ).lean();

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Secondary offer not found",
        });
      }

      res.json({
        success: true,
        data: offer,
        message: `Secondary offer ${active ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      console.error("Error toggling secondary offer status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle secondary offer status",
        error: error.message,
      });
    }
  }
);

module.exports = router;
