/**
 * Outlets Routes
 * API endpoints for managing retail outlets/POS
 */

const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Outlet = require("../models/Outlet");
const Route = require("../models/Route");
const OutletType = require("../models/OutletType");
const OutletChannel = require("../models/OutletChannel");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

const idValidation = [
  param("id").isMongoId().withMessage("Invalid outlet ID"),
  handleValidationErrors,
];

const createValidation = [
  body("outlet_name").trim().notEmpty().withMessage("Outlet name is required"),
  body("route_id").isMongoId().withMessage("Valid route is required"),
  body("outlet_type").isMongoId().withMessage("Valid outlet type is required"),
  body("outlet_channel_id").isMongoId().withMessage("Valid outlet channel is required"),
  body("mobile")
    .optional({ checkFalsy: true })
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Invalid mobile number format (use 01XXXXXXXXX or +8801XXXXXXXXX)"),
  body("lati").optional().isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
  body("longi").optional().isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
  body("credit_limit")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Credit limit must be non-negative"),
  handleValidationErrors,
];

const updateValidation = [
  body("outlet_name").optional().trim().notEmpty().withMessage("Outlet name cannot be empty"),
  body("route_id").optional().isMongoId().withMessage("Invalid route ID"),
  body("outlet_type").optional().isMongoId().withMessage("Invalid outlet type ID"),
  body("outlet_channel_id").optional().isMongoId().withMessage("Invalid outlet channel ID"),
  body("mobile")
    .optional({ checkFalsy: true })
    .matches(/^(\+88)?01[3-9]\d{8}$/)
    .withMessage("Invalid mobile number format"),
  body("lati").optional().isFloat({ min: -90, max: 90 }).withMessage("Invalid latitude"),
  body("longi").optional().isFloat({ min: -180, max: 180 }).withMessage("Invalid longitude"),
  body("credit_limit")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Credit limit must be non-negative"),
  body("active").optional().isBoolean().withMessage("Active must be a boolean"),
  handleValidationErrors,
];

/**
 * @route   GET /api/v1/outlets
 * @desc    Get all outlets with filtering and pagination
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  requireApiPermission("outlets:read"),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
    query("search").optional().trim(),
    query("route_id").optional().isMongoId().withMessage("Invalid route ID"),
    query("outlet_type").optional().isMongoId().withMessage("Invalid outlet type ID"),
    query("outlet_channel_id").optional().isMongoId().withMessage("Invalid outlet channel ID"),
    query("verification_status")
      .optional()
      .isIn(["PENDING", "VERIFIED", "REJECTED", "all"])
      .withMessage("Invalid verification status"),
    query("active")
      .optional()
      .isIn(["true", "false", "all"])
      .withMessage("Active must be true, false, or all"),
    query("sortBy")
      .optional()
      .isIn(["outlet_name", "outlet_id", "created_date", "update_date_time"])
      .withMessage("Invalid sort field"),
    query("sortOrder")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Sort order must be asc or desc"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        route_id,
        outlet_type,
        outlet_channel_id,
        verification_status = "all",
        active = "all",
        sortBy = "outlet_name",
        sortOrder = "asc",
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query = {};

      // Filter by active status
      if (active !== "all") {
        query.active = active === "true";
      }

      // Filter by verification status
      if (verification_status !== "all") {
        query.verification_status = verification_status;
      }

      // Filter by route
      if (route_id) {
        query.route_id = route_id;
      }

      // Filter by outlet type
      if (outlet_type) {
        query.outlet_type = outlet_type;
      }

      // Filter by outlet channel
      if (outlet_channel_id) {
        query.outlet_channel_id = outlet_channel_id;
      }

      // Search filter (outlet name, ID, mobile, contact person)
      if (search) {
        query.$or = [
          { outlet_name: { $regex: search, $options: "i" } },
          { outlet_name_bangla: { $regex: search, $options: "i" } },
          { outlet_id: { $regex: search, $options: "i" } },
          { mobile: { $regex: search, $options: "i" } },
          { contact_person: { $regex: search, $options: "i" } },
        ];
      }

      // Sort options
      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute query with population
      const [outlets, total] = await Promise.all([
        Outlet.find(query)
          .populate("route_id", "route_id route_name")
          .populate("outlet_type", "name")
          .populate("outlet_channel_id", "name")
          .populate("verified_by", "username email")
          .populate("created_by", "username email")
          .populate("updated_by", "username email")
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Outlet.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: outlets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching outlets:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching outlets",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/v1/outlets/nearby
 * @desc    Get nearby outlets based on GPS coordinates
 * @access  Private
 */
router.get(
  "/nearby",
  authenticate,
  requireApiPermission("outlets:read"),
  [
    query("lat").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude is required"),
    query("lon").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude is required"),
    query("radius")
      .optional()
      .isFloat({ min: 0.1, max: 50 })
      .withMessage("Radius must be between 0.1 and 50 km"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { lat, lon, radius = 5 } = req.query;

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const maxDistanceKm = parseFloat(radius);

      const outlets = await Outlet.findNearby(longitude, latitude, maxDistanceKm);

      res.json({
        success: true,
        data: outlets,
        count: outlets.length,
      });
    } catch (error) {
      console.error("Error finding nearby outlets:", error);
      res.status(500).json({
        success: false,
        message: "Error finding nearby outlets",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/v1/outlets/field-register/metadata
 * @desc    Lookup data (outlet types + channels) for mobile Add-New-Outlet form.
 *          Placed BEFORE /:id so the literal path matches first.
 * @access  Private (authenticated)
 */
router.get("/field-register/metadata", authenticate, async (req, res) => {
  try {
    const [outletTypes, outletChannels] = await Promise.all([
      OutletType.find({ active: true }).select("_id name").sort({ name: 1 }).lean(),
      OutletChannel.find({ active: true }).select("_id name").sort({ name: 1 }).lean(),
    ]);
    res.json({
      success: true,
      data: { outlet_types: outletTypes, outlet_channels: outletChannels },
    });
  } catch (error) {
    console.error("[FIELD-REGISTER] metadata error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching registration metadata",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/v1/outlets/field-register/my-registrations
 * @desc    Outlets registered by current SO (any status).
 *          Placed BEFORE /:id so the literal path matches first.
 * @access  Private (authenticated)
 */
router.get("/field-register/my-registrations", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 50 } = req.query;
    const filter = { created_by: userId };
    if (status && ["PENDING", "VERIFIED", "REJECTED"].includes(String(status).toUpperCase())) {
      filter.verification_status = String(status).toUpperCase();
    }
    const outlets = await Outlet.find(filter)
      .populate("route_id", "route_id route_name")
      .populate("outlet_type", "name")
      .populate("outlet_channel_id", "name")
      .sort({ created_date: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .lean();
    res.json({ success: true, data: outlets });
  } catch (error) {
    console.error("[FIELD-REGISTER] my-registrations error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching your registrations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/v1/outlets/:id
 * @desc    Get outlet by ID
 * @access  Private
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("outlets:read"),
  idValidation,
  async (req, res) => {
    try {
      const outlet = await Outlet.findById(req.params.id)
        .populate("route_id", "route_id route_name area_id db_point_id distributor_id")
        .populate({
          path: "route_id",
          populate: [
            { path: "area_id", select: "name territory_type" },
            { path: "db_point_id", select: "name territory_type" },
            { path: "distributor_id", select: "name" },
          ],
        })
        .populate("outlet_type", "name active")
        .populate("outlet_channel_id", "name active")
        .populate("verified_by", "username email")
        .populate("created_by", "username email")
        .populate("updated_by", "username email")
        .lean();

      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      res.json({
        success: true,
        data: outlet,
      });
    } catch (error) {
      console.error("Error fetching outlet:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching outlet",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/v1/outlets
 * @desc    Create new outlet
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("outlets:create"),
  createValidation,
  async (req, res) => {
    try {
      const userId = req.user._id;

      // Verify route exists
      const route = await Route.findById(req.body.route_id);
      if (!route) {
        return res.status(404).json({
          success: false,
          message: "Route not found",
        });
      }

      // Verify outlet type exists
      const outletType = await OutletType.findById(req.body.outlet_type);
      if (!outletType) {
        return res.status(404).json({
          success: false,
          message: "Outlet type not found",
        });
      }

      // Verify outlet channel exists
      const outletChannel = await OutletChannel.findById(req.body.outlet_channel_id);
      if (!outletChannel) {
        return res.status(404).json({
          success: false,
          message: "Outlet channel not found",
        });
      }

      // Generate outlet ID
      let outletId;
      if (req.body.outlet_id) {
        // Check if custom outlet_id already exists
        const existing = await Outlet.findOne({ outlet_id: req.body.outlet_id.toUpperCase() });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Outlet ID already exists",
          });
        }
        outletId = req.body.outlet_id.toUpperCase();
      } else {
        // Auto-generate outlet ID based on route
        outletId = await Outlet.generateOutletId(route.route_id);
      }

      // Create outlet
      const outletData = {
        ...req.body,
        outlet_id: outletId,
        created_by: userId,
        updated_by: userId,
        created_date: new Date(),
        update_date_time: new Date(),
      };

      // Set GeoJSON location if lat/lon provided
      if (req.body.lati && req.body.longi) {
        outletData.location = {
          type: "Point",
          coordinates: [req.body.longi, req.body.lati],
        };
      }

      const outlet = await Outlet.create(outletData);

      // Update route's actual outlet quantity
      await Route.findByIdAndUpdate(req.body.route_id, {
        $inc: { actual_outlet_qty: 1 },
      });

      // Populate before returning
      const populatedOutlet = await Outlet.findById(outlet._id)
        .populate("route_id", "route_id route_name")
        .populate("outlet_type", "name")
        .populate("outlet_channel_id", "name")
        .lean();

      res.status(201).json({
        success: true,
        message: "Outlet created successfully",
        data: populatedOutlet,
      });
    } catch (error) {
      console.error("Error creating outlet:", error);
      res.status(500).json({
        success: false,
        message: "Error creating outlet",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/v1/outlets/:id
 * @desc    Update outlet
 * @access  Private
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("outlets:update"),
  idValidation,
  updateValidation,
  async (req, res) => {
    try {
      const userId = req.user._id;

      const outlet = await Outlet.findById(req.params.id);
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      // If route is being changed, verify it exists and update route outlet counts
      if (req.body.route_id && req.body.route_id !== outlet.route_id.toString()) {
        const newRoute = await Route.findById(req.body.route_id);
        if (!newRoute) {
          return res.status(404).json({
            success: false,
            message: "Route not found",
          });
        }

        // Decrement old route, increment new route
        await Route.findByIdAndUpdate(outlet.route_id, {
          $inc: { actual_outlet_qty: -1 },
        });
        await Route.findByIdAndUpdate(req.body.route_id, {
          $inc: { actual_outlet_qty: 1 },
        });
      }

      // If outlet type is being changed, verify it exists
      if (req.body.outlet_type) {
        const outletType = await OutletType.findById(req.body.outlet_type);
        if (!outletType) {
          return res.status(404).json({
            success: false,
            message: "Outlet type not found",
          });
        }
      }

      // If outlet channel is being changed, verify it exists
      if (req.body.outlet_channel_id) {
        const outletChannel = await OutletChannel.findById(req.body.outlet_channel_id);
        if (!outletChannel) {
          return res.status(404).json({
            success: false,
            message: "Outlet channel not found",
          });
        }
      }

      // Update outlet
      Object.assign(outlet, req.body);
      outlet.updated_by = userId;
      outlet.update_date_time = new Date();

      await outlet.save();

      // Populate before returning
      const populatedOutlet = await Outlet.findById(outlet._id)
        .populate("route_id", "route_id route_name")
        .populate("outlet_type", "name")
        .populate("outlet_channel_id", "name")
        .lean();

      res.json({
        success: true,
        message: "Outlet updated successfully",
        data: populatedOutlet,
      });
    } catch (error) {
      console.error("Error updating outlet:", error);
      res.status(500).json({
        success: false,
        message: "Error updating outlet",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/outlets/:id
 * @desc    Deactivate outlet (soft delete)
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("outlets:delete"),
  idValidation,
  async (req, res) => {
    try {
      const userId = req.user._id;

      const outlet = await Outlet.findById(req.params.id);
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      outlet.active = false;
      outlet.updated_by = userId;
      outlet.update_date_time = new Date();
      await outlet.save();

      // Decrement route's actual outlet quantity
      await Route.findByIdAndUpdate(outlet.route_id, {
        $inc: { actual_outlet_qty: -1 },
      });

      res.json({
        success: true,
        message: "Outlet deactivated successfully",
        data: outlet,
      });
    } catch (error) {
      console.error("Error deactivating outlet:", error);
      res.status(500).json({
        success: false,
        message: "Error deactivating outlet",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PATCH /api/v1/outlets/:id/activate
 * @desc    Activate outlet
 * @access  Private
 */
router.patch(
  "/:id/activate",
  authenticate,
  requireApiPermission("outlets:update"),
  idValidation,
  async (req, res) => {
    try {
      const userId = req.user._id;

      const outlet = await Outlet.findById(req.params.id);
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      const wasInactive = !outlet.active;

      outlet.active = true;
      outlet.updated_by = userId;
      outlet.update_date_time = new Date();
      await outlet.save();

      // Increment route's actual outlet quantity if it was inactive
      if (wasInactive) {
        await Route.findByIdAndUpdate(outlet.route_id, {
          $inc: { actual_outlet_qty: 1 },
        });
      }

      res.json({
        success: true,
        message: "Outlet activated successfully",
        data: outlet,
      });
    } catch (error) {
      console.error("Error activating outlet:", error);
      res.status(500).json({
        success: false,
        message: "Error activating outlet",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PATCH /api/v1/outlets/:id/verify
 * @desc    Verify outlet (for mobile app)
 * @access  Private
 */
router.patch(
  "/:id/verify",
  authenticate,
  requireApiPermission("outlets:update"),
  idValidation,
  [
    body("verification_status")
      .isIn(["VERIFIED", "REJECTED"])
      .withMessage("Status must be VERIFIED or REJECTED"),
    body("shop_photo_url").optional().isURL().withMessage("Invalid photo URL"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user._id;

      const outlet = await Outlet.findById(req.params.id);
      if (!outlet) {
        return res.status(404).json({
          success: false,
          message: "Outlet not found",
        });
      }

      outlet.verification_status = req.body.verification_status;
      outlet.verified_by = userId;
      outlet.verified_at = new Date();
      outlet.updated_by = userId;
      outlet.update_date_time = new Date();

      if (req.body.shop_photo_url) {
        outlet.shop_photo_url = req.body.shop_photo_url;
      }

      await outlet.save();

      res.json({
        success: true,
        message: "Outlet verification updated successfully",
        data: outlet,
      });
    } catch (error) {
      console.error("Error verifying outlet:", error);
      res.status(500).json({
        success: false,
        message: "Error verifying outlet",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * =============================================================================
 * MOBILE FIELD REGISTRATION (SO creates new outlet from mobile app)
 * =============================================================================
 * These endpoints let an authenticated Sales Officer register a new outlet
 * directly from their phone while on route. The outlet is auto-scoped to the
 * SO's currently assigned route for the day and is created in PENDING state
 * until an admin/distributor verifies it.
 *
 * NOTE: The two GET helpers for this flow (metadata + my-registrations) are
 * defined earlier in the file, above `GET /:id`, so the literal paths match
 * before being consumed by the ObjectId route.
 */

/**
 * @route   POST /api/v1/outlets/field-register
 * @desc    SO registers a new outlet from mobile app. GPS is mandatory.
 *          Route is auto-resolved from the SO's assignment for the given
 *          (or current) day. Outlet is created with verification_status
 *          PENDING and immediately added to the route's outlet list so the
 *          SO can visit it in the same session.
 * @access  Private (authenticated; does NOT require outlets:create)
 */
router.post(
  "/field-register",
  authenticate,
  [
    body("outlet_name").trim().notEmpty().withMessage("Outlet name is required"),
    body("outlet_type").isMongoId().withMessage("Valid outlet type is required"),
    body("outlet_channel_id").isMongoId().withMessage("Valid outlet channel is required"),
    body("lati").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude is required"),
    body("longi").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude is required"),
    body("mobile")
      .optional({ checkFalsy: true })
      .matches(/^(\+88)?01[3-9]\d{8}$/)
      .withMessage("Invalid mobile number format (use 01XXXXXXXXX)"),
    body("gps_accuracy")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("GPS accuracy must be non-negative"),
    body("day")
      .optional()
      .isIn(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"])
      .withMessage("Invalid day"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user._id;
      const employeeId = req.user.employee_id;

      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: "No employee record linked to this user. Please contact admin.",
        });
      }

      // Reject suspiciously inaccurate GPS (> 100 m). Prevents desk-bound fake
      // registrations. Mobile should send accuracy from Geolocation API.
      if (req.body.gps_accuracy !== undefined && Number(req.body.gps_accuracy) > 100) {
        return res.status(400).json({
          success: false,
          message: `GPS accuracy ${req.body.gps_accuracy}m is too low. Move to an open area and retry.`,
        });
      }

      // Resolve SO's route for the target day (same logic as /my-route)
      const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const targetDay = (req.body.day || daysOfWeek[new Date().getDay()]).toUpperCase();
      const employeeObjectId =
        employeeId instanceof mongoose.Types.ObjectId
          ? employeeId
          : new mongoose.Types.ObjectId(employeeId);

      const route = await Route.findOne({
        $or: [
          {
            "sr_assignments.sr_1.sr_id": employeeObjectId,
            "sr_assignments.sr_1.visit_days": { $in: [targetDay] },
          },
          {
            "sr_assignments.sr_2.sr_id": employeeObjectId,
            "sr_assignments.sr_2.visit_days": { $in: [targetDay] },
          },
        ],
        active: true,
      });

      if (!route) {
        return res.status(404).json({
          success: false,
          message: `No active route assigned for ${targetDay}. Cannot register outlet.`,
        });
      }

      // Verify lookup references
      const [outletType, outletChannel] = await Promise.all([
        OutletType.findById(req.body.outlet_type).lean(),
        OutletChannel.findById(req.body.outlet_channel_id).lean(),
      ]);
      if (!outletType) {
        return res.status(404).json({ success: false, message: "Outlet type not found" });
      }
      if (!outletChannel) {
        return res.status(404).json({ success: false, message: "Outlet channel not found" });
      }

      // Auto-generate outlet_id scoped to the resolved route
      const outletId = await Outlet.generateOutletId(route.route_id);

      // Build outlet payload — force SO-safe defaults regardless of client input
      const lati = Number(req.body.lati);
      const longi = Number(req.body.longi);
      const outletData = {
        outlet_id: outletId,
        outlet_name: req.body.outlet_name.trim(),
        outlet_name_bangla: req.body.outlet_name_bangla?.trim(),
        route_id: route._id,
        outlet_type: outletType._id,
        outlet_channel_id: outletChannel._id,
        address: req.body.address?.trim(),
        address_bangla: req.body.address_bangla?.trim(),
        contact_person: req.body.contact_person?.trim(),
        mobile: req.body.mobile?.trim(),
        lati,
        longi,
        location: {
          type: "Point",
          coordinates: [longi, lati],
        },
        shop_photo_url: req.body.shop_photo_url,
        market_size: Number(req.body.market_size) || 0,
        credit_limit: Number(req.body.credit_limit) || 0,
        // Force mobile-registered outlets into approval queue
        verification_status: "PENDING",
        active: true,
        comments: req.body.comments?.trim(),
        created_by: userId,
        updated_by: userId,
        created_date: new Date(),
        update_date_time: new Date(),
      };

      const outlet = await Outlet.create(outletData);

      // Attach to route so SO can visit it immediately in the same session
      await Route.findByIdAndUpdate(route._id, {
        $addToSet: { outlet_ids: outlet._id },
        $inc: { actual_outlet_qty: 1 },
      });

      const populated = await Outlet.findById(outlet._id)
        .populate("route_id", "route_id route_name")
        .populate("outlet_type", "name")
        .populate("outlet_channel_id", "name")
        .lean();

      console.log(
        `[FIELD-REGISTER] Employee ${employeeId} registered outlet ${outlet.outlet_id} on route ${route.route_id} (PENDING)`
      );

      res.status(201).json({
        success: true,
        message: "Outlet registered. Awaiting admin verification.",
        data: populated,
      });
    } catch (error) {
      console.error("[FIELD-REGISTER] error:", error);
      res.status(500).json({
        success: false,
        message: "Error registering outlet",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
