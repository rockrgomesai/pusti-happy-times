/**
 * Factory Routes
 * Pusti Happy Times - Factory Management Endpoints
 *
 * Mirrors the /brands module to keep master data management consistent.
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const { Factory } = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */
const factoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Factory name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Factory name must be between 1 and 100 characters"),
];

const idValidation = [
  param("id").isMongoId().withMessage("Invalid factory ID format"),
];

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

// GET /api/factories - list factories
router.get(
  "/",
  authenticate,
  requireApiPermission("factories:read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = "name" } = req.query;
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      const sortField = typeof sort === "string" ? sort : "name";
      const skip = (pageNumber - 1) * limitNumber;

      const factories = await Factory.find({})
        .sort({ [sortField]: 1 })
        .skip(skip)
        .limit(limitNumber)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      const totalCount = await Factory.countDocuments();
      const totalPages = Math.ceil(totalCount / limitNumber) || 1;

      res.json({
        success: true,
        data: factories,
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
      console.error("Error fetching factories:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching factories",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// GET /api/factories/:id - single factory
router.get(
  "/:id",
  authenticate,
  requireApiPermission("factories:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const factory = await Factory.findById(req.params.id)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      if (!factory) {
        return res.status(404).json({
          success: false,
          message: "Factory not found",
        });
      }

      res.json({
        success: true,
        data: factory,
      });
    } catch (error) {
      console.error("Error fetching factory:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching factory",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// POST /api/factories - create factory
router.post(
  "/",
  authenticate,
  requireApiPermission("factories:create"),
  factoryValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.body;
      const currentUserId = getCurrentUserId(req);

      const existingFactory = await Factory.findOne({ name });
      if (existingFactory) {
        return res.status(400).json({
          success: false,
          message: "Factory already exists",
        });
      }

      const newFactory = new Factory({
        name,
        created_by: currentUserId,
        updated_by: currentUserId,
      });

      await newFactory.save();
      await newFactory.populate("created_by", "username");
      await newFactory.populate("updated_by", "username");

      res.status(201).json({
        success: true,
        message: "Factory created successfully",
        data: newFactory,
      });
    } catch (error) {
      console.error("Error creating factory:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Factory already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating factory",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// PUT /api/factories/:id - update factory
router.put(
  "/:id",
  authenticate,
  requireApiPermission("factories:update"),
  idValidation,
  factoryValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.body;
      const currentUserId = getCurrentUserId(req);

      const existingFactory = await Factory.findById(req.params.id);
      if (!existingFactory) {
        return res.status(404).json({
          success: false,
          message: "Factory not found",
        });
      }

      const duplicate = await Factory.findOne({
        name,
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Factory name already exists",
        });
      }

      const updatedFactory = await Factory.findByIdAndUpdate(
        req.params.id,
        {
          name,
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
        message: "Factory updated successfully",
        data: updatedFactory,
      });
    } catch (error) {
      console.error("Error updating factory:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Factory name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating factory",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// DELETE /api/factories/:id - delete factory
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("factories:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const factory = await Factory.findById(req.params.id);
      if (!factory) {
        return res.status(404).json({
          success: false,
          message: "Factory not found",
        });
      }

      await Factory.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Factory deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting factory:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting factory",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
