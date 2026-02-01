/**
 * Outlet Types Routes
 * API endpoints for managing outlet type classifications
 */

const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const OutletType = require("../models/OutletType");
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
  param("id").isMongoId().withMessage("Invalid outlet type ID"),
  handleValidationErrors,
];

const createValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Outlet type name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  handleValidationErrors,
];

const updateValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Outlet type name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("active").optional().isBoolean().withMessage("Active must be a boolean"),
  handleValidationErrors,
];

/**
 * @route   GET /api/v1/outlet-types
 * @desc    Get all outlet types with filtering and pagination
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  requireApiPermission("outlet-types:read"),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
    query("search").optional().trim(),
    query("active")
      .optional()
      .isIn(["true", "false", "all"])
      .withMessage("Active must be true, false, or all"),
    query("sortBy")
      .optional()
      .isIn(["name", "created_at", "updated_at"])
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
        active = "all",
        sortBy = "name",
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

      // Search filter
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      // Sort options
      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Execute query
      const [outletTypes, total] = await Promise.all([
        OutletType.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
        OutletType.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: outletTypes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching outlet types:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching outlet types",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/v1/outlet-types/:id
 * @desc    Get outlet type by ID
 * @access  Private
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("outlet-types:read"),
  idValidation,
  async (req, res) => {
    try {
      const outletType = await OutletType.findById(req.params.id).lean();

      if (!outletType) {
        return res.status(404).json({
          success: false,
          message: "Outlet type not found",
        });
      }

      res.json({
        success: true,
        data: outletType,
      });
    } catch (error) {
      console.error("Error fetching outlet type:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching outlet type",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/v1/outlet-types
 * @desc    Create new outlet type
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("outlet-types:create"),
  createValidation,
  async (req, res) => {
    try {
      const { name } = req.body;
      const username = req.user.username || req.user.email;

      // Check for duplicate
      const existing = await OutletType.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Outlet type with this name already exists",
        });
      }

      const outletType = await OutletType.create({
        name,
        created_by: username,
        updated_by: username,
      });

      res.status(201).json({
        success: true,
        message: "Outlet type created successfully",
        data: outletType,
      });
    } catch (error) {
      console.error("Error creating outlet type:", error);
      res.status(500).json({
        success: false,
        message: "Error creating outlet type",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/v1/outlet-types/:id
 * @desc    Update outlet type
 * @access  Private
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("outlet-types:update"),
  [...idValidation, ...updateValidation],
  async (req, res) => {
    try {
      const { name, active } = req.body;
      const username = req.user.username || req.user.email;

      const outletType = await OutletType.findById(req.params.id);
      if (!outletType) {
        return res.status(404).json({
          success: false,
          message: "Outlet type not found",
        });
      }

      // Check for duplicate name if name is being updated
      if (name && name !== outletType.name) {
        const existing = await OutletType.findOne({
          name: { $regex: `^${name}$`, $options: "i" },
          _id: { $ne: req.params.id },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Outlet type with this name already exists",
          });
        }
        outletType.name = name;
      }

      if (active !== undefined) {
        outletType.active = active;
      }

      outletType.updated_by = username;
      await outletType.save();

      res.json({
        success: true,
        message: "Outlet type updated successfully",
        data: outletType,
      });
    } catch (error) {
      console.error("Error updating outlet type:", error);
      res.status(500).json({
        success: false,
        message: "Error updating outlet type",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/outlet-types/:id
 * @desc    Deactivate outlet type (soft delete)
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("outlet-types:delete"),
  idValidation,
  async (req, res) => {
    try {
      const username = req.user.username || req.user.email;

      const outletType = await OutletType.findById(req.params.id);
      if (!outletType) {
        return res.status(404).json({
          success: false,
          message: "Outlet type not found",
        });
      }

      outletType.active = false;
      outletType.updated_by = username;
      await outletType.save();

      res.json({
        success: true,
        message: "Outlet type deactivated successfully",
        data: outletType,
      });
    } catch (error) {
      console.error("Error deactivating outlet type:", error);
      res.status(500).json({
        success: false,
        message: "Error deactivating outlet type",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PATCH /api/v1/outlet-types/:id/activate
 * @desc    Activate outlet type
 * @access  Private
 */
router.patch(
  "/:id/activate",
  authenticate,
  requireApiPermission("outlet-types:update"),
  idValidation,
  async (req, res) => {
    try {
      const username = req.user.username || req.user.email;

      const outletType = await OutletType.findById(req.params.id);
      if (!outletType) {
        return res.status(404).json({
          success: false,
          message: "Outlet type not found",
        });
      }

      outletType.active = true;
      outletType.updated_by = username;
      await outletType.save();

      res.json({
        success: true,
        message: "Outlet type activated successfully",
        data: outletType,
      });
    } catch (error) {
      console.error("Error activating outlet type:", error);
      res.status(500).json({
        success: false,
        message: "Error activating outlet type",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
