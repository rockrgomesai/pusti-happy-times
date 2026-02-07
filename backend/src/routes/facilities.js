/**
 * Facility Routes
 * Pusti Happy Times - Unified Facility Management Endpoints
 *
 * This replaces the separate depot and factory routes with a unified facility system.
 */

const express = require("express");
const { body, validationResult, param, query } = require("express-validator");
const { Facility } = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */
const facilityValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Facility name is required")
    .isLength({ min: 1, max: 120 })
    .withMessage("Facility name must be between 1 and 120 characters"),
  body("type")
    .isIn(["Factory", "Depot"])
    .withMessage("Facility type must be either 'Factory' or 'Depot'"),
];

const idValidation = [param("id").isMongoId().withMessage("Invalid facility ID format")];

/**
 * Helpers
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }
  next();
};

const getCurrentUserId = (req) => req.user?.id || req.user?._id;

/**
 * Routes
 */

// GET /api/facilities - list facilities with optional type filter
router.get("/", authenticate, requireApiPermission("facilities:read"), async (req, res) => {
  try {
    const { page = 1, limit = 50, sort = "name", type } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const sortField = typeof sort === "string" ? sort : "name";
    const skip = (pageNumber - 1) * limitNumber;

    // Build query filter
    const filter = {};
    if (type && ["Factory", "Depot"].includes(type)) {
      filter.type = type;
    }

    const facilities = await Facility.find(filter)
      .sort({ [sortField]: 1 })
      .skip(skip)
      .limit(limitNumber)
      .populate("created_by", "username")
      .populate("updated_by", "username");

    const totalCount = await Facility.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNumber) || 1;

    res.json({
      success: true,
      data: facilities,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalCount,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching facilities:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching facilities",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/facilities/depots - list only depots (with optional search)
router.get("/depots", authenticate, requireApiPermission("facilities:read"), async (req, res) => {
  try {
    const { search, limit } = req.query;
    const limitNumber = limit ? parseInt(limit, 10) : undefined;

    // Build query filter
    const filter = { type: "Depot" };
    
    // Add search filter if provided
    if (search && typeof search === 'string' && search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { depot_id: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    let query = Facility.find(filter)
      .sort({ name: 1 })
      .select("_id name depot_id location active contact_person contact_mobile");
    
    // Apply limit if specified
    if (limitNumber) {
      query = query.limit(limitNumber);
    }

    const depots = await query;

    res.json({
      success: true,
      data: depots,
      totalCount: depots.length,
    });
  } catch (error) {
    console.error("Error fetching depots:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching depots",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/facilities/factories - list only factories
router.get(
  "/factories",
  authenticate,
  requireApiPermission("facilities:read"),
  async (req, res) => {
    try {
      const factories = await Facility.find({ type: "Factory" })
        .sort({ name: 1 })
        .select("_id name factory_id location active contact_person contact_mobile");

      res.json({
        success: true,
        data: factories,
        totalCount: factories.length,
      });
    } catch (error) {
      console.error("Error fetching factories:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching factories",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * Get facilities assigned to current facility employee
 * @route   GET /api/v1/facilities/my-facilities
 * @access  Private (facility employees only)
 */
router.get("/my-facilities", authenticate, async (req, res) => {
  try {
    // Check if user is a facility employee
    const { user_type, employee_type, facility_id } = req.userContext || {};

    console.log("🔍 /my-facilities userContext:", {
      user_type,
      employee_type,
      facility_id,
      fullContext: req.userContext,
    });

    if (user_type !== "employee" || employee_type !== "facility") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Facility employee access required.",
      });
    }

    if (!facility_id) {
      return res.json({
        success: true,
        data: { facility: null },
      });
    }

    // Fetch assigned facility
    const facility = await Facility.findById(facility_id).select(
      "_id name location active contact_person contact_mobile type"
    );

    res.json({
      success: true,
      data: { facility },
    });
  } catch (error) {
    console.error("Error fetching my facilities:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching facilities",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Get facility-specific stats
 * @route   GET /api/v1/facilities/stats
 * @access  Private (facility employees only)
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    // Check if user is a facility employee
    const { user_type, employee_type, facility_id } = req.userContext || {};

    if (user_type !== "employee" || employee_type !== "facility") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Facility employee access required.",
      });
    }

    // Return zero stats - actual implementation pending
    const stats = {
      totalInventory: 0,
      pendingOrders: 0,
      todayShipments: 0,
      lowStockItems: 0,
    };

    // TODO: Implement actual stats calculation when inventory system is ready
    // const totalInventory = await Inventory.aggregate([
    //   { $match: { facility_id: facility_id } },
    //   { $group: { _id: null, total: { $sum: '$quantity' } } }
    // ]);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching facility stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/facilities/:id - single facility
router.get(
  "/:id",
  authenticate,
  requireApiPermission("facilities:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const facility = await Facility.findById(req.params.id)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      if (!facility) {
        return res.status(404).json({
          success: false,
          message: "Facility not found",
        });
      }

      res.json({
        success: true,
        data: facility,
      });
    } catch (error) {
      console.error("Error fetching facility:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching facility",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// POST /api/facilities - create facility
router.post(
  "/",
  authenticate,
  requireApiPermission("facilities:create"),
  facilityValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, depot_id, factory_id, location, contact_person, contact_mobile, active } =
        req.body;
      const currentUserId = getCurrentUserId(req);

      const existingFacility = await Facility.findOne({ name });
      if (existingFacility) {
        return res.status(400).json({
          success: false,
          message: "Facility with this name already exists",
        });
      }

      const newFacility = new Facility({
        name,
        type,
        depot_id: type === "Depot" ? depot_id : undefined,
        factory_id: type === "Factory" ? factory_id : undefined,
        location,
        contact_person,
        contact_mobile,
        active: active !== undefined ? active : true,
        created_by: currentUserId,
        updated_by: currentUserId,
      });

      await newFacility.save();
      await newFacility.populate("created_by", "username");
      await newFacility.populate("updated_by", "username");

      res.status(201).json({
        success: true,
        message: "Facility created successfully",
        data: newFacility,
      });
    } catch (error) {
      console.error("Error creating facility:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Facility already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating facility",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// PUT /api/facilities/:id - update facility
router.put(
  "/:id",
  authenticate,
  requireApiPermission("facilities:update"),
  idValidation,
  facilityValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, depot_id, factory_id, location, contact_person, contact_mobile, active } =
        req.body;
      const currentUserId = getCurrentUserId(req);

      const existingFacility = await Facility.findById(req.params.id);
      if (!existingFacility) {
        return res.status(404).json({
          success: false,
          message: "Facility not found",
        });
      }

      const duplicate = await Facility.findOne({
        name,
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Facility name already exists",
        });
      }

      const updatedFacility = await Facility.findByIdAndUpdate(
        req.params.id,
        {
          name,
          type,
          depot_id: type === "Depot" ? depot_id : existingFacility.depot_id,
          factory_id: type === "Factory" ? factory_id : existingFacility.factory_id,
          location,
          contact_person,
          contact_mobile,
          active,
          updated_by: currentUserId,
          updated_at: new Date(),
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("created_by", "username")
        .populate("updated_by", "username");

      res.json({
        success: true,
        message: "Facility updated successfully",
        data: updatedFacility,
      });
    } catch (error) {
      console.error("Error updating facility:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Facility name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating facility",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// DELETE /api/facilities/:id - delete facility
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("facilities:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const facility = await Facility.findById(req.params.id);
      if (!facility) {
        return res.status(404).json({
          success: false,
          message: "Facility not found",
        });
      }

      await Facility.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Facility deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting facility:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting facility",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
