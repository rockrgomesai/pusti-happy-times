/**
 * Distributor Routes
 * Strictly limited to the agreed contract.
 */

const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Distributor = require("../models/Distributor");
const Territory = require("../models/Territory");
const Offer = require("../models/Offer");
const { requireApiPermission, authenticate } = require("../middleware/auth");

const router = express.Router();

const PRODUCT_SEGMENTS = ["BIS", "BEV"];
const DISTRIBUTOR_TYPES = [
  "Commission Distributor",
  "General Distributor",
  "Special Distributor",
  "Spot Distributor",
  "Super Distributor",
];
const BINARY_CHOICES = ["Yes", "No"];
const ORDER_UNITS = ["CTN", "PCS"];

const parseObjectId = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }
  return next();
};

const sanitizeDecimal = (value) => {
  if (value == null || value === "") {
    return undefined;
  }
  if (value instanceof mongoose.Types.Decimal128) {
    return value;
  }
  if (typeof value === "number") {
    return mongoose.Types.Decimal128.fromString(value.toFixed(2));
  }
  const numeric = String(value).replace(/[^0-9.\-]/g, "");
  if (!numeric.length) {
    return undefined;
  }
  return mongoose.Types.Decimal128.fromString(numeric);
};

const sanitizeDistributorPayload = (payload) => {
  const sanitized = {};

  if (payload.name !== undefined) sanitized.name = payload.name;
  if (payload.db_point_id !== undefined) {
    const parsedDbPoint = parseObjectId(payload.db_point_id);
    if (parsedDbPoint) {
      sanitized.db_point_id = parsedDbPoint;
    }
  }
  if (payload.product_segment !== undefined)
    sanitized.product_segment = Array.isArray(payload.product_segment)
      ? payload.product_segment.map((segment) => segment)
      : [payload.product_segment];
  if (payload.skus_exclude !== undefined) {
    const ids = Array.isArray(payload.skus_exclude) ? payload.skus_exclude : [payload.skus_exclude];
    sanitized.skus_exclude = ids.map((id) => parseObjectId(id)).filter((value) => value != null);
  }
  if (payload.distributor_type !== undefined) sanitized.distributor_type = payload.distributor_type;
  if (payload.erp_id !== undefined) sanitized.erp_id = payload.erp_id;
  if (payload.mobile !== undefined) sanitized.mobile = payload.mobile;
  if (payload.credit_limit !== undefined)
    sanitized.credit_limit = sanitizeDecimal(payload.credit_limit);
  if (payload.bank_guarantee !== undefined)
    sanitized.bank_guarantee = sanitizeDecimal(payload.bank_guarantee);
  if (payload.delivery_depot_id !== undefined) {
    if (payload.delivery_depot_id === null) {
      sanitized.delivery_depot_id = null;
    } else {
      const parsedDepot = parseObjectId(payload.delivery_depot_id);
      if (parsedDepot) {
        sanitized.delivery_depot_id = parsedDepot;
      }
    }
  }
  if (payload.proprietor !== undefined) sanitized.proprietor = payload.proprietor;
  if (payload.proprietor_dob !== undefined)
    sanitized.proprietor_dob = payload.proprietor_dob ? new Date(payload.proprietor_dob) : null;
  if (payload.registration_date !== undefined)
    sanitized.registration_date = payload.registration_date
      ? new Date(payload.registration_date)
      : null;
  if (payload.computer !== undefined) sanitized.computer = payload.computer;
  if (payload.printer !== undefined) sanitized.printer = payload.printer;
  if (payload.emergency_contact !== undefined)
    sanitized.emergency_contact = payload.emergency_contact;
  if (payload.emergency_relation !== undefined)
    sanitized.emergency_relation = payload.emergency_relation;
  if (payload.emergency_mobile !== undefined) sanitized.emergency_mobile = payload.emergency_mobile;
  if (payload.unit !== undefined) sanitized.unit = payload.unit;
  if (payload.latitude !== undefined) sanitized.latitude = payload.latitude;
  if (payload.longitude !== undefined) sanitized.longitude = payload.longitude;
  if (payload.address !== undefined) sanitized.address = payload.address;
  if (payload.note !== undefined) sanitized.note = payload.note;
  if (payload.active !== undefined) sanitized.active = payload.active;

  return sanitized;
};

const buildTerritoryValidation = () =>
  body("db_point_id")
    .custom(async (value) => {
      const id = parseObjectId(value);
      if (!id) {
        throw new Error("Invalid DB Point identifier");
      }
      const territory = await Territory.findById(id).select(["type", "ancestors"]);
      if (!territory) {
        throw new Error("DB Point not found");
      }
      if (territory.type !== "db_point") {
        throw new Error("Selected territory must be a DB Point");
      }
      return true;
    })
    .bail();

const distributorValidators = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 3, max: 160 })
    .withMessage("Distributor name must be between 3 and 160 characters"),
  buildTerritoryValidation(),
  body("product_segment").custom((value) => {
    const segments = Array.isArray(value) ? value : [value];
    if (!segments.length) {
      throw new Error("Product segment is required");
    }
    const invalid = segments.some((segment) => !PRODUCT_SEGMENTS.includes(segment));
    if (invalid) {
      throw new Error("Invalid product segment supplied");
    }
    return true;
  }),
  body("skus_exclude")
    .optional()
    .custom((value) => {
      const ids = Array.isArray(value) ? value : [value];
      const invalid = ids.some((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalid) {
        throw new Error("Invalid SKU identifier provided");
      }
      return true;
    }),
  body("distributor_type")
    .isString()
    .custom((value) => DISTRIBUTOR_TYPES.includes(value))
    .withMessage("Invalid distributor type"),
  body("erp_id").optional({ nullable: true }).isInt().withMessage("ERP ID must be an integer"),
  body("mobile").optional({ nullable: true }).isString().withMessage("Mobile must be a string"),
  body("credit_limit")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("Credit limit must be numeric"),
  body("bank_guarantee")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("Bank guarantee must be numeric"),
  body("delivery_depot_id")
    .optional({ nullable: true })
    .custom((value) => !value || mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid depot identifier"),
  body("proprietor")
    .optional({ nullable: true })
    .isString()
    .withMessage("Proprietor must be a string"),
  body("proprietor_dob")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Proprietor date of birth must be a valid date"),
  body("registration_date")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Registration date must be a valid date"),
  body("computer")
    .optional({ nullable: true })
    .custom((value) => !value || BINARY_CHOICES.includes(value))
    .withMessage("Computer field must be 'Yes' or 'No'"),
  body("printer")
    .optional({ nullable: true })
    .custom((value) => !value || BINARY_CHOICES.includes(value))
    .withMessage("Printer field must be 'Yes' or 'No'"),
  body("emergency_contact")
    .optional({ nullable: true })
    .isString()
    .withMessage("Emergency contact must be a string"),
  body("emergency_relation")
    .optional({ nullable: true })
    .isString()
    .withMessage("Emergency relation must be a string"),
  body("emergency_mobile")
    .optional({ nullable: true })
    .isString()
    .withMessage("Emergency mobile must be a string"),
  body("unit")
    .isString()
    .custom((value) => ORDER_UNITS.includes(value))
    .withMessage("Unit must be CTN or PCS"),
  body("latitude").optional({ nullable: true }).isString().withMessage("Latitude must be a string"),
  body("longitude")
    .optional({ nullable: true })
    .isString()
    .withMessage("Longitude must be a string"),
  body("address").optional({ nullable: true }).isString().withMessage("Address must be a string"),
  body("note").optional({ nullable: true }).isString().withMessage("Note must be a string"),
  body("active").optional({ nullable: true }).isBoolean().withMessage("Active must be a boolean"),
];

router.get(
  "/",
  requireApiPermission("distributors:read"),
  [
    query("search").optional().isString(),
    query("segment")
      .optional()
      .custom((value) => PRODUCT_SEGMENTS.includes(value))
      .withMessage("Invalid product segment"),
    query("type")
      .optional()
      .custom((value) => DISTRIBUTOR_TYPES.includes(value))
      .withMessage("Invalid distributor type"),
    query("active").optional().isBoolean().withMessage("Active flag must be boolean"),
    query("db_point_id")
      .optional()
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("DB Point ID must be a valid ObjectId"),
    query("area_id")
      .optional()
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage("Area ID must be a valid ObjectId"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { search, segment, type, active, db_point_id, area_id, limit = 50, offset = 0 } = req.query;

      const queryBuilder = {};

      if (typeof active !== "undefined") {
        queryBuilder.active = active === true || active === "true";
      }

      if (segment) {
        queryBuilder.product_segment = segment;
      }

      if (type) {
        queryBuilder.distributor_type = type;
      }

      // Filter by DB Point
      if (db_point_id) {
        queryBuilder.db_point_id = db_point_id;
      }

      // Filter by Area (find all DB Points in the area, then find distributors)
      if (area_id && !db_point_id) {
        const dbPoints = await Territory.find({ 
          parent_id: area_id, 
          type: 'db_point', 
          active: true 
        }).select('_id').lean();
        
        if (dbPoints.length > 0) {
          queryBuilder.db_point_id = { $in: dbPoints.map(dp => dp._id) };
        } else {
          // No DB Points in this area, return empty result
          return res.json({
            success: true,
            data: [],
            meta: {
              total: 0,
              limit: parseInt(limit, 10),
              offset: parseInt(offset, 10),
            },
          });
        }
      }

      if (search) {
        queryBuilder.$or = [
          { name: { $regex: search, $options: "i" } },
          { mobile: { $regex: search, $options: "i" } },
          { erp_id: Number.isNaN(Number(search)) ? undefined : Number(search) },
        ].filter(Boolean);
      }

      const sanitizedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
      const sanitizedOffset = Math.max(parseInt(offset, 10) || 0, 0);

      const [total, distributors] = await Promise.all([
        Distributor.countDocuments(queryBuilder),
        Distributor.find(queryBuilder)
          .sort({ name: 1 })
          .skip(sanitizedOffset)
          .limit(sanitizedLimit)
          .lean(),
      ]);

      return res.json({
        success: true,
        data: distributors,
        meta: {
          total,
          limit: sanitizedLimit,
          offset: sanitizedOffset,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch distributors",
        error: error.message,
      });
    }
  }
);

router.get(
  "/:id",
  requireApiPermission("distributors:read"),
  [param("id").custom((value) => mongoose.Types.ObjectId.isValid(value))],
  handleValidationErrors,
  async (req, res) => {
    try {
      const distributor = await Distributor.findById(req.params.id).lean();
      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: "Distributor not found",
        });
      }
      return res.json({ success: true, data: distributor });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch distributor",
        error: error.message,
      });
    }
  }
);

router.post(
  "/",
  requireApiPermission("distributors:create"),
  distributorValidators,
  handleValidationErrors,
  async (req, res) => {
    try {
      const payload = sanitizeDistributorPayload(req.body);
      const currentUserId = req.user?._id ? parseObjectId(req.user._id) : null;

      if (currentUserId) {
        payload.created_by = currentUserId;
        payload.updated_by = currentUserId;
      }

      const distributor = await Distributor.create(payload);
      return res.status(201).json({ success: true, data: distributor });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Distributor with the same unique field already exists",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to create distributor",
        error: error.message,
      });
    }
  }
);

router.put(
  "/:id",
  requireApiPermission("distributors:update"),
  [param("id").custom((value) => mongoose.Types.ObjectId.isValid(value))],
  distributorValidators,
  handleValidationErrors,
  async (req, res) => {
    try {
      const payload = sanitizeDistributorPayload(req.body);
      const currentUserId = req.user?._id ? parseObjectId(req.user._id) : null;
      if (currentUserId) {
        payload.updated_by = currentUserId;
      }

      const distributor = await Distributor.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
        context: "query",
      });

      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: "Distributor not found",
        });
      }

      return res.json({ success: true, data: distributor });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Distributor with the same unique field already exists",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to update distributor",
        error: error.message,
      });
    }
  }
);

router.delete(
  "/:id",
  requireApiPermission("distributors:delete"),
  [param("id").custom((value) => mongoose.Types.ObjectId.isValid(value))],
  handleValidationErrors,
  async (req, res) => {
    try {
      const currentUserId = req.user?._id ? parseObjectId(req.user._id) : null;
      const update = { active: false };
      if (currentUserId) {
        update.updated_by = currentUserId;
      }
      const distributor = await Distributor.findByIdAndUpdate(req.params.id, update, {
        new: true,
      });
      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: "Distributor not found",
        });
      }
      return res.json({ success: true, data: distributor });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to deactivate distributor",
        error: error.message,
      });
    }
  }
);

/**
 * GET /distributors/my-offers
 * Get offers eligible for the currently logged-in distributor
 */
router.get(
  "/my-offers",
  authenticate,
  [
    query("status")
      .optional()
      .isIn(["draft", "active", "paused", "expired", "completed"])
      .withMessage("Invalid status"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
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

      // Check if user is a distributor
      if (req.user.user_type !== "distributor") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only distributors can access this endpoint.",
        });
      }

      // Find the distributor record for this user
      const distributor = await Distributor.findOne({
        user_id: req.user._id,
        active: true,
      }).populate("db_point_id");

      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: "Distributor record not found for this user",
        });
      }

      const { status, page = 1, limit = 20 } = req.query;

      // Use the Offer model's static method to find eligible offers
      let offers = await Offer.findEligibleForDistributor(distributor._id);

      // Additional filtering by status if provided
      if (status) {
        offers = offers.filter((offer) => offer.status === status);
      }

      // Sort by createdAt descending
      offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = offers.length;
      const paginatedOffers = offers.slice(skip, skip + parseInt(limit));

      // Populate references for the paginated results
      const populatedOffers = await Offer.populate(paginatedOffers, [
        {
          path: "config.selectedProducts",
          select: "sku bangla_name unit db_price mrp",
          strictPopulate: false,
        },
        {
          path: "created_by",
          select: "name email",
          strictPopulate: false,
        },
      ]);

      res.json({
        success: true,
        data: populatedOffers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        distributor: {
          id: distributor._id,
          name: distributor.name,
          product_segment: distributor.product_segment,
          db_point: distributor.db_point_id
            ? {
                id: distributor.db_point_id._id,
                name: distributor.db_point_id.name,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Error fetching distributor offers:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch offers",
        error: error.message,
      });
    }
  }
);

module.exports = router;
