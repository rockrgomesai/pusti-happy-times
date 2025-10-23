/**
 * Brand Routes
 * Pusti Happy Times - Brand Management Endpoints
 *
 * This file contains all brand-related routes including
 * CRUD operations with proper authentication and authorization.
 *
 * Features:
 * - Full CRUD operations for brands
 * - Role-based access control
 * - API permission validation
 * - Audit trail for all operations
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const { Brand, User } = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */

// Brand validation rules
const brandValidation = [
  body("brand")
    .trim()
    .notEmpty()
    .withMessage("Brand name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Brand name must be between 1 and 100 characters"),
  body("active").optional().isBoolean().withMessage("Active must be a boolean value"),
];

// ID parameter validation
const idValidation = [param("id").isMongoId().withMessage("Invalid brand ID format")];

/**
 * Helper Functions
 */

/**
 * Handle validation errors
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

/**
 * Get current user ID from request
 */
const getCurrentUserId = (req) => {
  return req.user?.id || req.user?._id;
};

/**
 * Routes
 */

/**
 * @route   GET /api/brands
 * @desc    Get all brands
 * @access  Private - requires brands:read permission
 */
router.get("/", authenticate, requireApiPermission("brands:read"), async (req, res) => {
  try {
    const { sort = "name" } = req.query;

    const sortOptions = { [sort]: 1 };

    // Get all brands without pagination
    const brands = await Brand.find({})
      .sort(sortOptions)
      .populate("created_by", "username")
      .populate("updated_by", "username");

    // Get total count
    const totalCount = brands.length;

    res.json({
      success: true,
      data: brands,
      pagination: {
        totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching brands",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /api/brands/:id
 * @desc    Get brand by ID
 * @access  Private - requires brands:read permission
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("brands:read"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const brand = await Brand.findById(req.params.id)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      res.json({
        success: true,
        data: brand,
      });
    } catch (error) {
      console.error("Error fetching brand:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching brand",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/brands
 * @desc    Create new brand
 * @access  Private - requires brands:create permission
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("brands:create"),
  brandValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { brand, active } = req.body;
      const currentUserId = getCurrentUserId(req);

      // Check if brand already exists
      const existingBrand = await Brand.findOne({ brand });
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: "Brand already exists",
        });
      }

      // Create new brand
      const newBrand = new Brand({
        brand,
        active: active !== undefined ? active : true,
        created_by: currentUserId,
        updated_by: currentUserId,
      });

      await newBrand.save();

      // Populate user references for response
      await newBrand.populate("created_by", "username");
      await newBrand.populate("updated_by", "username");

      res.status(201).json({
        success: true,
        message: "Brand created successfully",
        data: newBrand,
      });
    } catch (error) {
      console.error("Error creating brand:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Brand already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating brand",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/brands/:id
 * @desc    Update brand
 * @access  Private - requires brands:update permission
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("brands:update"),
  idValidation,
  brandValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { brand, active } = req.body;
      const currentUserId = getCurrentUserId(req);

      // Debug logging
      console.log("🔍 UPDATE BRAND - Request body:", req.body);
      console.log("🔍 UPDATE BRAND - Extracted brand:", brand);
      console.log("🔍 UPDATE BRAND - Extracted active:", active);
      console.log("🔍 UPDATE BRAND - Active type:", typeof active);

      // Check if brand exists
      const existingBrand = await Brand.findById(req.params.id);
      if (!existingBrand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      console.log("🔍 UPDATE BRAND - Existing brand:", existingBrand);

      // Check if new brand name already exists (excluding current brand)
      const duplicateBrand = await Brand.findOne({
        brand,
        _id: { $ne: req.params.id },
      });
      if (duplicateBrand) {
        return res.status(400).json({
          success: false,
          message: "Brand name already exists",
        });
      }

      // Prepare update data
      const updateData = {
        brand,
        updated_by: currentUserId,
        updated_at: new Date(),
      };

      // Add active field if provided
      if (active !== undefined) {
        updateData.active = active;
      }

      console.log("🔍 UPDATE BRAND - Update data:", updateData);

      // Update brand
      const updatedBrand = await Brand.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("created_by", "username")
        .populate("updated_by", "username");

      console.log("🔍 UPDATE BRAND - Updated brand:", updatedBrand);

      res.json({
        success: true,
        message: "Brand updated successfully",
        data: updatedBrand,
      });
    } catch (error) {
      console.error("Error updating brand:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Brand name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating brand",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/brands/:id
 * @desc    Delete brand
 * @access  Private - requires brands:delete permission
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("brands:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if brand exists
      const brand = await Brand.findById(req.params.id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      // Delete brand
      await Brand.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Brand deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting brand",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
