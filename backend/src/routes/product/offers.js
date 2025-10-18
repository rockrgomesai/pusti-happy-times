const express = require("express");
const { query, body, param, validationResult } = require("express-validator");
const { Territory, Distributor, Product, Category, Brand, Offer } = require("../../models");
const { requireApiPermission } = require("../../middleware/auth");

const router = express.Router();

// =====================
// TERRITORY ROUTES
// =====================

/**
 * GET /product/offers/territories/:type
 * Get territories by type (zone, region, area, db_point)
 * with optional parent filtering
 */
router.get(
  "/territories/:type",
  requireApiPermission("offers:read"),
  [
    param("type")
      .isIn(["zone", "region", "area", "db_point"])
      .withMessage("Invalid territory type"),
    query("parent_id")
      .optional()
      .isMongoId()
      .withMessage("Invalid parent ID"),
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

      const { type } = req.params;
      const { parent_id } = req.query;

      const filter = { type, active: true };
      
      if (parent_id) {
        filter.parent_id = parent_id;
      } else if (type !== "zone") {
        // If not zone and no parent specified, return empty
        return res.json({
          success: true,
          data: [],
        });
      }

      const territories = await Territory.find(filter)
        .select("_id name code bangla_name type level parent_id ancestors")
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: territories,
      });
    } catch (error) {
      console.error("Error fetching territories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch territories",
        error: error.message,
      });
    }
  }
);

/**
 * GET /product/offers/territories
 * Get all territories
 */
router.get(
  "/territories",
  requireApiPermission("offers:read"),
  async (req, res) => {
    try {
      const territories = await Territory.find({ active: true })
        .select("_id name code bangla_name type level parent_id ancestors")
        .sort({ level: 1, name: 1 })
        .lean();

      res.json({
        success: true,
        data: territories,
      });
    } catch (error) {
      console.error("Error fetching all territories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch territories",
        error: error.message,
      });
    }
  }
);

// =====================
// DISTRIBUTOR ROUTES
// =====================

/**
 * POST /product/offers/distributors/eligible
 * Get eligible distributors filtered by db_points and product segments
 */
router.post(
  "/distributors/eligible",
  requireApiPermission("offers:read"),
  [
    body("dbPointIds")
      .isArray({ min: 1 })
      .withMessage("At least one DB point required"),
    body("dbPointIds.*")
      .isMongoId()
      .withMessage("Invalid DB point ID"),
    body("segments")
      .isArray({ min: 1 })
      .withMessage("At least one product segment required"),
    body("segments.*")
      .isIn(["BIS", "BEV"])
      .withMessage("Invalid product segment"),
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

      const { dbPointIds, segments } = req.body;

      // Find distributors where:
      // 1. db_point_id is in the selected dbPointIds
      // 2. product_segment array has at least one match with segments
      const distributors = await Distributor.find({
        db_point_id: { $in: dbPointIds },
        product_segment: { $in: segments },
        active: true,
      })
        .select("_id name db_point_id product_segment distributor_type mobile contact_number")
        .populate("db_point_id", "name code")
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: distributors,
        count: distributors.length,
      });
    } catch (error) {
      console.error("Error fetching eligible distributors:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch eligible distributors",
        error: error.message,
      });
    }
  }
);

/**
 * GET /product/offers/distributors/by-dbpoint/:id
 * Get distributors by DB point
 */
router.get(
  "/distributors/by-dbpoint/:id",
  requireApiPermission("offers:read"),
  [
    param("id")
      .isMongoId()
      .withMessage("Invalid DB point ID"),
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

      const distributors = await Distributor.find({
        db_point_id: id,
        active: true,
      })
        .select("_id name db_point_id product_segment distributor_type mobile")
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: distributors,
      });
    } catch (error) {
      console.error("Error fetching distributors by DB point:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch distributors",
        error: error.message,
      });
    }
  }
);

// =====================
// PRODUCT ROUTES
// =====================

/**
 * POST /product/offers/products/by-segment
 * Get products by segment and type
 */
router.post(
  "/products/by-segment",
  requireApiPermission("offers:read"),
  [
    body("segments")
      .isArray({ min: 1 })
      .withMessage("At least one segment required"),
    body("segments.*")
      .isIn(["BIS", "BEV"])
      .withMessage("Invalid segment"),
    body("type")
      .isIn(["MANUFACTURED", "PROCURED"])
      .withMessage("Invalid product type"),
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

      const { segments, type } = req.body;

      // Get categories that match the segments
      const categories = await Category.find({
        product_segment: { $in: segments },
        active: true,
      }).select("_id");

      const categoryIds = categories.map(cat => cat._id);

      const products = await Product.find({
        category_id: { $in: categoryIds },
        product_type: type,
        active: true,
      })
        .select("_id name sku product_type category_id brand_id unit ctn_pcs db_price mrp")
        .populate("category_id", "name product_segment")
        .populate("brand_id", "brand")
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("Error fetching products by segment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }
);

/**
 * GET /product/offers/products/procured
 * Get all PROCURED products (gift products)
 */
router.get(
  "/products/procured",
  requireApiPermission("offers:read"),
  async (req, res) => {
    try {
      const products = await Product.find({
        product_type: "PROCURED",
        active: true,
      })
        .select("_id name sku product_type category_id brand_id unit")
        .populate("category_id", "name product_segment")
        .populate("brand_id", "brand")
        .sort({ name: 1 })
        .lean();

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("Error fetching procured products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch procured products",
        error: error.message,
      });
    }
  }
);

/**
 * POST /product/offers/products/grouped-by-category
 * Get products grouped by leaf categories for selected segments
 */
router.post(
  "/products/grouped-by-category",
  requireApiPermission("offers:read"),
  [
    body("segments")
      .isArray({ min: 1 })
      .withMessage("At least one segment required"),
    body("segments.*")
      .isIn(["BIS", "BEV"])
      .withMessage("Invalid segment"),
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

      const { segments } = req.body;

      // Get all categories that match the segments
      const allCategories = await Category.find({
        product_segment: { $in: segments },
        active: true,
      }).lean();

      // Find leaf categories (categories that are not parents)
      const parentIds = new Set(
        allCategories
          .filter(cat => cat.parent_id !== null)
          .map(cat => cat.parent_id.toString())
      );

      const leafCategories = allCategories.filter(
        cat => !parentIds.has(cat._id.toString())
      );

      const leafCategoryIds = leafCategories.map(cat => cat._id);

      // Get products for leaf categories only
      const products = await Product.find({
        category_id: { $in: leafCategoryIds },
        active: true,
      })
        .select("_id sku bangla_name product_type category_id brand_id unit ctn_pcs db_price mrp trade_price")
        .populate("category_id", "name product_segment")
        .populate("brand_id", "brand")
        .lean();

      // Filter out products with missing populated fields
      const validProducts = products.filter(p => p.category_id && p.category_id._id);

      // Group products by category
      const grouped = leafCategories
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(category => ({
          category: {
            _id: category._id,
            name: category.name,
            product_segment: category.product_segment,
          },
          products: validProducts
            .filter(p => p.category_id && p.category_id._id && p.category_id._id.toString() === category._id.toString())
            .map(p => ({
              _id: p._id,
              name: p.sku, // Use SKU as the name/identifier
              sku: p.sku,
              bangla_name: p.bangla_name,
              product_type: p.product_type,
              unit: p.unit,
              trade_price: p.trade_price,
              db_price: p.db_price,
              mrp: p.mrp,
              category_id: p.category_id._id,
              brand_id: p.brand_id ? p.brand_id._id : null
            }))
            .sort((a, b) => a.sku.localeCompare(b.sku)), // Sort by SKU
        }))
        .filter(group => group.products.length > 0); // Only include categories with products

      res.json({
        success: true,
        data: grouped,
      });
    } catch (error) {
      console.error("Error fetching grouped products:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch grouped products",
        error: error.message,
      });
    }
  }
);

// =====================
// OFFER CRUD ROUTES (Placeholder)
// =====================

/**
 * POST /product/offers
 * Create a new offer
 */
router.post(
  "/",
  requireApiPermission("offers:create"),
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
        "FREE_PRODUCT",
        "BUNDLE_OFFER",
        "BOGO",
        "CASHBACK",
        "VOLUME_DISCOUNT",
        "CROSS_CATEGORY",
        "FIRST_ORDER",
        "LOYALTY_POINTS",
        "FLASH_SALE"
      ])
      .withMessage("Invalid offer type"),
    body("product_segments")
      .isArray({ min: 1 })
      .withMessage("At least one product segment is required"),
    body("product_segments.*")
      .isIn(["BIS", "BEV"])
      .withMessage("Invalid product segment"),
    body("start_date")
      .isISO8601()
      .withMessage("Valid start date is required"),
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
      .isIn(["draft", "active", "paused", "expired", "completed"])
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
        distributors,
        config,
        status,
        active,
        description,
        internal_notes
      } = req.body;

      // Create the offer
      const offer = new Offer({
        name,
        offer_type,
        product_segments,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        status: status || "draft",
        active: active !== undefined ? active : true,
        territories: territories || {
          zones: { ids: [], mode: "include" },
          regions: { ids: [], mode: "include" },
          areas: { ids: [], mode: "include" },
          db_points: { ids: [], mode: "include" }
        },
        distributors: distributors || { ids: [], mode: "include" },
        config: config || {},
        description,
        internal_notes,
        created_by: req.user._id,
        updated_by: req.user._id
      });

      await offer.save();

      // Populate references for response
      await offer.populate([
        { path: "config.selectedProducts", select: "sku bangla_name unit db_price" },
        { path: "territories.zones.ids", select: "name type level" },
        { path: "territories.regions.ids", select: "name type level" },
        { path: "territories.areas.ids", select: "name type level" },
        { path: "territories.db_points.ids", select: "name type level" },
        { path: "distributors.ids", select: "name mobile db_point_id" },
        { path: "created_by", select: "name email" }
      ]);

      res.status(201).json({
        success: true,
        message: "Offer created successfully",
        data: offer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create offer",
        error: error.message,
      });
    }
  }
);

/**
 * GET /product/offers
 * Get all offers with filtering and pagination
 */
router.get(
  "/",
  requireApiPermission("offers:read"),
  [
    query("status")
      .optional()
      .isIn(["draft", "active", "paused", "expired", "completed"])
      .withMessage("Invalid status filter"),
    query("offer_type")
      .optional()
      .isIn([
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
      ])
      .withMessage("Invalid offer type"),
    query("active")
      .optional()
      .isBoolean()
      .withMessage("Active must be boolean"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
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
        status,
        offer_type,
        active,
        page = 1,
        limit = 20,
        search
      } = req.query;

      // Build filter
      const filter = {};
      
      if (status) filter.status = status;
      if (offer_type) filter.offer_type = offer_type;
      if (active !== undefined) filter.active = active === 'true';
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Fetch offers
      const [offers, total] = await Promise.all([
        Offer.find(filter)
          .select("-internal_notes") // Hide internal notes from list
          .populate("config.selectedProducts", "sku bangla_name unit")
          .populate("created_by", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Offer.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: offers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch offers",
        error: error.message,
      });
    }
  }
);

/**
 * GET /product/offers/:id
 * Get offer by ID
 */
router.get(
  "/:id",
  requireApiPermission("offers:read"),
  [
    param("id")
      .isMongoId()
      .withMessage("Invalid offer ID"),
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

      const offer = await Offer.findById(req.params.id)
        .populate("config.selectedProducts", "sku bangla_name unit db_price mrp")
        .populate("territories.zones.ids", "name type level")
        .populate("territories.regions.ids", "name type level")
        .populate("territories.areas.ids", "name type level")
        .populate("territories.db_points.ids", "name type level")
        .populate("distributors.ids", "name mobile db_point_id")
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .populate("approved_by", "name email")
        .lean();

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      res.json({
        success: true,
        data: offer,
      });
    } catch (error) {
      console.error("Error fetching offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch offer",
        error: error.message,
      });
    }
  }
);


/**
 * PUT /product/offers/:id
 * Update offer
 */
router.put(
  "/:id",
  requireApiPermission("offers:update"),
  [
    param("id").isMongoId().withMessage("Invalid offer ID"),
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("offer_type").optional().isIn(["FLAT_DISCOUNT_PCT", "FLAT_DISCOUNT_AMT", "DISCOUNT_SLAB_PCT", "DISCOUNT_SLAB_AMT", "FREE_PRODUCT", "BUNDLE_OFFER", "BOGO", "CASHBACK", "VOLUME_DISCOUNT", "CROSS_CATEGORY", "FIRST_ORDER", "LOYALTY_POINTS", "FLASH_SALE"]).withMessage("Invalid offer type"),
    body("product_segments").optional().isArray({ min: 1 }).withMessage("Product segments must be a non-empty array"),
    body("start_date").optional().isISO8601().withMessage("Invalid start date"),
    body("end_date").optional().isISO8601().withMessage("Invalid end date"),
    body("status").optional().isIn(["draft", "active", "paused", "expired", "completed"]).withMessage("Invalid status"),
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

      // Add updated_by
      updateData.updated_by = req.user._id;

      // Validate end_date > start_date if both provided
      if (updateData.end_date && updateData.start_date) {
        if (new Date(updateData.end_date) <= new Date(updateData.start_date)) {
          return res.status(400).json({
            success: false,
            message: "End date must be after start date",
          });
        }
      }

      const offer = await Offer.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .populate("config.selectedProducts", "sku bangla_name unit db_price mrp")
        .populate("territories.zones.ids", "name type level")
        .populate("territories.regions.ids", "name type level")
        .populate("territories.areas.ids", "name type level")
        .populate("territories.db_points.ids", "name type level")
        .populate("distributors.ids", "name mobile db_point_id")
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .populate("approved_by", "name email")
        .lean();

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      res.json({
        success: true,
        data: offer,
        message: "Offer updated successfully",
      });
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update offer",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /product/offers/:id
 * Delete offer (soft delete by setting status to 'completed')
 */
router.delete(
  "/:id",
  requireApiPermission("offers:delete"),
  [
    param("id").isMongoId().withMessage("Invalid offer ID"),
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
      
      // Soft delete - set status to completed and active to false
      const offer = await Offer.findByIdAndUpdate(
        id,
        { 
          status: "completed", 
          active: false,
          updated_by: req.user._id 
        },
        { new: true }
      ).lean();

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      res.json({
        success: true,
        data: offer,
        message: "Offer deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete offer",
        error: error.message,
      });
    }
  }
);

/**
 * PATCH /product/offers/:id/status
 * Toggle offer active status
 */
router.patch(
  "/:id/status",
  requireApiPermission("offers:update"),
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

      const offer = await Offer.findByIdAndUpdate(
        id,
        { 
          active,
          updated_by: req.user._id,
          // If deactivating, set status to paused
          ...(active === false && { status: "paused" })
        },
        { new: true }
      )
        .populate("config.selectedProducts", "sku bangla_name unit")
        .lean();

      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      res.json({
        success: true,
        data: offer,
        message: `Offer ${active ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      console.error("Error toggling offer status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle offer status",
        error: error.message,
      });
    }
  }
);

/**
 * POST /product/offers/:id/duplicate
 * Duplicate an offer
 */
router.post(
  "/:id/duplicate",
  requireApiPermission("offers:create"),
  [
    param("id").isMongoId().withMessage("Invalid offer ID"),
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
      
      // Find the original offer
      const originalOffer = await Offer.findById(id).lean();

      if (!originalOffer) {
        return res.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      // Create a duplicate with modified fields
      const duplicateData = {
        ...originalOffer,
        _id: undefined, // Remove _id to create new document
        name: `${originalOffer.name} (Copy)`,
        status: "draft",
        active: false,
        created_by: req.user._id,
        updated_by: req.user._id,
        approved_by: undefined,
        approved_at: undefined,
        stats: {
          totalOrders: 0,
          totalRevenue: 0,
          totalDiscount: 0,
          uniqueDistributors: 0,
        },
        createdAt: undefined,
        updatedAt: undefined,
      };

      const duplicatedOffer = await Offer.create(duplicateData);

      // Populate the response
      const populatedOffer = await Offer.findById(duplicatedOffer._id)
        .populate("config.selectedProducts", "sku bangla_name unit db_price mrp")
        .populate("territories.zones.ids", "name type level")
        .populate("territories.regions.ids", "name type level")
        .populate("territories.areas.ids", "name type level")
        .populate("territories.db_points.ids", "name type level")
        .populate("distributors.ids", "name mobile db_point_id")
        .populate("created_by", "name email")
        .lean();

      res.status(201).json({
        success: true,
        data: populatedOffer,
        message: "Offer duplicated successfully",
      });
    } catch (error) {
      console.error("Error duplicating offer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to duplicate offer",
        error: error.message,
      });
    }
  }
);

module.exports = router;
