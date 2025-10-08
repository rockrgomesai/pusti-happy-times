/**
 * Depot Routes
 * Pusti Happy Times - Depot Management Endpoints
 *
 * Mirrors the factories module to keep master data consistent.
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const { Depot } = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */
const depotValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Depot name is required")
    .isLength({ min: 1, max: 120 })
    .withMessage("Depot name must be between 1 and 120 characters"),
];

const idValidation = [
  param("id").isMongoId().withMessage("Invalid depot ID format"),
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

// GET /api/depots - list depots
router.get(
  "/",
  authenticate,
  requireApiPermission("depots:read"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = "name" } = req.query;
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      const sortField = typeof sort === "string" ? sort : "name";
      const skip = (pageNumber - 1) * limitNumber;

      const depots = await Depot.find({})
        .sort({ [sortField]: 1 })
        .skip(skip)
        .limit(limitNumber)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      const totalCount = await Depot.countDocuments();
      const totalPages = Math.ceil(totalCount / limitNumber) || 1;

      res.json({
        success: true,
        data: depots,
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
      console.error("Error fetching depots:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching depots",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// GET /api/depots/:id - single depot
router.get(
  "/:id",
  authenticate,
  requireApiPermission("depots:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const depot = await Depot.findById(req.params.id)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      if (!depot) {
        return res.status(404).json({
          success: false,
          message: "Depot not found",
        });
      }

      res.json({
        success: true,
        data: depot,
      });
    } catch (error) {
      console.error("Error fetching depot:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching depot",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// POST /api/depots - create depot
router.post(
  "/",
  authenticate,
  requireApiPermission("depots:create"),
  depotValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.body;
      const currentUserId = getCurrentUserId(req);

      const existingDepot = await Depot.findOne({ name });
      if (existingDepot) {
        return res.status(400).json({
          success: false,
          message: "Depot already exists",
        });
      }

      const newDepot = new Depot({
        name,
        created_by: currentUserId,
        updated_by: currentUserId,
      });

      await newDepot.save();
      await newDepot.populate("created_by", "username");
      await newDepot.populate("updated_by", "username");

      res.status(201).json({
        success: true,
        message: "Depot created successfully",
        data: newDepot,
      });
    } catch (error) {
      console.error("Error creating depot:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Depot already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating depot",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// PUT /api/depots/:id - update depot
router.put(
  "/:id",
  authenticate,
  requireApiPermission("depots:update"),
  idValidation,
  depotValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name } = req.body;
      const currentUserId = getCurrentUserId(req);

      const existingDepot = await Depot.findById(req.params.id);
      if (!existingDepot) {
        return res.status(404).json({
          success: false,
          message: "Depot not found",
        });
      }

      const duplicate = await Depot.findOne({
        name,
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Depot name already exists",
        });
      }

      const updatedDepot = await Depot.findByIdAndUpdate(
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
        message: "Depot updated successfully",
        data: updatedDepot,
      });
    } catch (error) {
      console.error("Error updating depot:", error);

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Depot name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating depot",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// DELETE /api/depots/:id - delete depot
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("depots:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const depot = await Depot.findById(req.params.id);
      if (!depot) {
        return res.status(404).json({
          success: false,
          message: "Depot not found",
        });
      }

      await Depot.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Depot deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting depot:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting depot",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
