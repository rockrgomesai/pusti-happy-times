const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const Route = require("../models/Route");
const { authenticate, requireApiPermission } = require("../middleware/auth");

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// @route   GET /api/v1/routes
// @desc    Get all routes with filtering
// @access  Private
router.get(
  "/",
  authenticate,
  requireApiPermission("routes:read"),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt().withMessage("Limit must be an integer"),
    query("search").optional().trim(),
    query("area_id").optional().isMongoId().withMessage("Invalid area ID"),
    query("db_point_id").optional().isMongoId().withMessage("Invalid DB point ID"),
    query("distributor_id").optional().isMongoId().withMessage("Invalid distributor ID"),
    query("sr_id").optional().isMongoId().withMessage("Invalid SR ID"),
    query("active").optional().isBoolean().withMessage("Active must be boolean"),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100000,
        search = "",
        area_id,
        db_point_id,
        distributor_id,
        sr_id,
        active,
      } = req.query;

      const filter = {};

      // Search by route_id or route_name
      if (search) {
        filter.$or = [
          { route_id: { $regex: search, $options: "i" } },
          { route_name: { $regex: search, $options: "i" } },
        ];
      }

      // Filter by area
      if (area_id) {
        filter.area_id = area_id;
      }

      // Filter by DB point
      if (db_point_id) {
        filter.db_point_id = db_point_id;
      }

      // Filter by distributor
      if (distributor_id) {
        filter.distributor_id = distributor_id;
      }

      // Filter by SR (either sr_1 or sr_2)
      if (sr_id) {
        filter.$or = [
          { "sr_assignments.sr_1.sr_id": sr_id },
          { "sr_assignments.sr_2.sr_id": sr_id },
        ];
      }

      // Filter by active status
      if (active !== undefined) {
        filter.active = active === "true";
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [routes, total] = await Promise.all([
        Route.find(filter)
          .populate("area_id", "territory_id name parent_id")
          .populate("db_point_id", "territory_id name parent_id")
          .populate("distributor_id", "distributor_id name db_point_id")
          .populate("sr_assignments.sr_1.sr_id", "employee_id name designation_id")
          .populate("sr_assignments.sr_2.sr_id", "employee_id name designation_id")
          .populate("created_by", "name email")
          .populate("updated_by", "name email")
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Route.countDocuments(filter),
      ]);

      res.json({
        routes,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   GET /api/v1/routes/:id
// @desc    Get route by ID
// @access  Private
router.get(
  "/:id",
  authenticate,
  requireApiPermission("routes:read"),
  [param("id").isMongoId().withMessage("Invalid route ID")],
  validate,
  async (req, res) => {
    try {
      const route = await Route.findById(req.params.id)
        .populate("area_id", "territory_id name parent_id")
        .populate("db_point_id", "territory_id name parent_id")
        .populate("distributor_id", "distributor_id name db_point_id")
        .populate("sr_assignments.sr_1.sr_id", "employee_id name designation_id")
        .populate("sr_assignments.sr_2.sr_id", "employee_id name designation_id")
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .lean();

      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      res.json(route);
    } catch (error) {
      console.error("Error fetching route:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   POST /api/v1/routes
// @desc    Create new route
// @access  Private
router.post(
  "/",
  authenticate,
  requireApiPermission("routes:create"),
  [
    body("route_id").trim().notEmpty().withMessage("Route ID is required"),
    body("route_name").trim().notEmpty().withMessage("Route name is required"),
    body("area_id").isMongoId().withMessage("Invalid area ID"),
    body("db_point_id").isMongoId().withMessage("Invalid DB point ID"),
    body("distributor_id").isMongoId().withMessage("Invalid distributor ID"),
    body("sr_assignments.sr_1.sr_id")
      .optional({ nullable: true })
      .isMongoId()
      .withMessage("Invalid SR 1 ID"),
    body("sr_assignments.sr_1.visit_days")
      .optional()
      .isArray()
      .withMessage("Visit days must be an array"),
    body("sr_assignments.sr_2.sr_id")
      .optional({ nullable: true })
      .isMongoId()
      .withMessage("Invalid SR 2 ID"),
    body("sr_assignments.sr_2.visit_days")
      .optional()
      .isArray()
      .withMessage("Visit days must be an array"),
    body("frequency").optional().isNumeric().withMessage("Frequency must be a number"),
    body("contribution").optional().isNumeric().withMessage("Contribution must be a number"),
    body("contribution_mf").optional().isNumeric().withMessage("Contribution MF must be a number"),
    body("route_pf").optional().isNumeric().withMessage("Route PF must be a number"),
    body("outlet_qty").optional().isNumeric().withMessage("Outlet quantity must be a number"),
    body("actual_outlet_qty")
      .optional()
      .isNumeric()
      .withMessage("Actual outlet quantity must be a number"),
  ],
  validate,
  async (req, res) => {
    try {
      // Check if route_id already exists
      const existingRoute = await Route.findOne({ route_id: req.body.route_id.toUpperCase() });
      if (existingRoute) {
        return res.status(400).json({ message: "Route ID already exists" });
      }

      const routeData = {
        ...req.body,
        route_id: req.body.route_id.toUpperCase(),
        created_by: req.user.id,
        updated_by: req.user.id,
      };

      const route = new Route(routeData);
      await route.save();

      const savedRoute = await Route.findById(route._id)
        .populate("area_id", "territory_id name parent_id")
        .populate("db_point_id", "territory_id name parent_id")
        .populate("distributor_id", "distributor_id name db_point_id")
        .populate("sr_assignments.sr_1.sr_id", "employee_id name designation_id")
        .populate("sr_assignments.sr_2.sr_id", "employee_id name designation_id")
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .lean();

      res.status(201).json({
        message: "Route created successfully",
        route: savedRoute,
      });
    } catch (error) {
      console.error("Error creating route:", error);
      if (error.message.includes("Distributor does not belong")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   PUT /api/v1/routes/:id
// @desc    Update route
// @access  Private
router.put(
  "/:id",
  authenticate,
  requireApiPermission("routes:update"),
  [
    param("id").isMongoId().withMessage("Invalid route ID"),
    body("route_id").optional().trim().notEmpty().withMessage("Route ID cannot be empty"),
    body("route_name").optional().trim().notEmpty().withMessage("Route name cannot be empty"),
    body("area_id").optional().isMongoId().withMessage("Invalid area ID"),
    body("db_point_id").optional().isMongoId().withMessage("Invalid DB point ID"),
    body("distributor_id").optional().isMongoId().withMessage("Invalid distributor ID"),
    body("sr_assignments.sr_1.sr_id")
      .optional({ nullable: true })
      .isMongoId()
      .withMessage("Invalid SR 1 ID"),
    body("sr_assignments.sr_1.visit_days")
      .optional()
      .isArray()
      .withMessage("Visit days must be an array"),
    body("sr_assignments.sr_2.sr_id")
      .optional({ nullable: true })
      .isMongoId()
      .withMessage("Invalid SR 2 ID"),
    body("sr_assignments.sr_2.visit_days")
      .optional()
      .isArray()
      .withMessage("Visit days must be an array"),
    body("frequency").optional().isNumeric().withMessage("Frequency must be a number"),
    body("contribution").optional().isNumeric().withMessage("Contribution must be a number"),
    body("contribution_mf").optional().isNumeric().withMessage("Contribution MF must be a number"),
    body("route_pf").optional().isNumeric().withMessage("Route PF must be a number"),
    body("outlet_qty").optional().isNumeric().withMessage("Outlet quantity must be a number"),
    body("actual_outlet_qty")
      .optional()
      .isNumeric()
      .withMessage("Actual outlet quantity must be a number"),
  ],
  validate,
  async (req, res) => {
    try {
      const route = await Route.findById(req.params.id);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      // If route_id is being changed, check for duplicates
      if (req.body.route_id && req.body.route_id.toUpperCase() !== route.route_id) {
        const existingRoute = await Route.findOne({ route_id: req.body.route_id.toUpperCase() });
        if (existingRoute) {
          return res.status(400).json({ message: "Route ID already exists" });
        }
        req.body.route_id = req.body.route_id.toUpperCase();
      }

      // Update fields
      Object.keys(req.body).forEach((key) => {
        if (key !== "created_by" && key !== "created_at") {
          route[key] = req.body[key];
        }
      });

      route.updated_by = req.user.id;
      await route.save();

      const updatedRoute = await Route.findById(route._id)
        .populate("area_id", "territory_id name parent_id")
        .populate("db_point_id", "territory_id name parent_id")
        .populate("distributor_id", "distributor_id name db_point_id")
        .populate("sr_assignments.sr_1.sr_id", "employee_id name designation_id")
        .populate("sr_assignments.sr_2.sr_id", "employee_id name designation_id")
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .lean();

      res.json({
        message: "Route updated successfully",
        route: updatedRoute,
      });
    } catch (error) {
      console.error("Error updating route:", error);
      if (error.message.includes("Distributor does not belong")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   DELETE /api/v1/routes/:id
// @desc    Delete route (soft delete - set active to false)
// @access  Private
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("routes:delete"),
  [param("id").isMongoId().withMessage("Invalid route ID")],
  validate,
  async (req, res) => {
    try {
      const route = await Route.findById(req.params.id);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      route.active = false;
      route.updated_by = req.user.id;
      await route.save();

      res.json({ message: "Route deactivated successfully" });
    } catch (error) {
      console.error("Error deleting route:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   PUT /api/v1/routes/:id/activate
// @desc    Activate a route
// @access  Private
router.put(
  "/:id/activate",
  authenticate,
  requireApiPermission("routes:update"),
  [param("id").isMongoId().withMessage("Invalid route ID")],
  validate,
  async (req, res) => {
    try {
      const route = await Route.findById(req.params.id);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      route.active = true;
      route.updated_by = req.user.id;
      await route.save();

      const updatedRoute = await Route.findById(route._id)
        .populate("area_id", "territory_id name parent_id")
        .populate("db_point_id", "territory_id name parent_id")
        .populate("distributor_id", "distributor_id name area_id")
        .populate("sr_assignments.sr_1.sr_id", "employee_id name designation_id")
        .populate("sr_assignments.sr_2.sr_id", "employee_id name designation_id")
        .populate("created_by", "name email")
        .populate("updated_by", "name email")
        .lean();

      res.json({
        message: "Route activated successfully",
        route: updatedRoute,
      });
    } catch (error) {
      console.error("Error activating route:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
