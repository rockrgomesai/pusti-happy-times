/**
 * Transport Routes
 * Pusti Happy Times - Transport Management Endpoints
 *
 * This file contains all transport-related routes including
 * CRUD operations with proper authentication and authorization.
 *
 * Features:
 * - Full CRUD operations for transports
 * - Role-based access control
 * - API permission validation
 * - Audit trail for all operations
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const { Transport, User } = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */

// Transport validation rules
const transportValidation = [
  body("transport")
    .trim()
    .notEmpty()
    .withMessage("Transport name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Transport name must be between 1 and 100 characters"),
];

// ID parameter validation
const idValidation = [
  param("id").isMongoId().withMessage("Invalid transport ID format"),
];

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
 * @route   GET /api/transports
 * @desc    Get all transports
 * @access  Private - requires transports:delete permission
 */
router.get(
  "/",
  authenticate,
  requireApiPermission("transports:delete"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = "transport" } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sort]: 1 },
      };

      // Calculate skip value for pagination
      const skip = (options.page - 1) * options.limit;

      // Get transports with pagination
      const transports = await Transport.find({})
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      // Get total count for pagination
      const totalCount = await Transport.countDocuments();
      const totalPages = Math.ceil(totalCount / options.limit);

      res.json({
        success: true,
        data: transports,
        pagination: {
          page: options.page,
          limit: options.limit,
          totalCount,
          totalPages,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching transports:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching transports",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/transports/:id
 * @desc    Get transport by ID
 * @access  Private - requires transports:delete permission
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("transports:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const transport = await Transport.findById(req.params.id)
        .populate("created_by", "username")
        .populate("updated_by", "username");

      if (!transport) {
        return res.status(404).json({
          success: false,
          message: "Transport not found",
        });
      }

      res.json({
        success: true,
        data: transport,
      });
    } catch (error) {
      console.error("Error fetching transport:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching transport",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/transports
 * @desc    Create new transport
 * @access  Private - requires transports:create permission
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("transports:create"),
  transportValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { transport } = req.body;
      const currentUserId = getCurrentUserId(req);

      // Check if transport already exists
      const existingTransport = await Transport.findOne({ transport });
      if (existingTransport) {
        return res.status(400).json({
          success: false,
          message: "Transport already exists",
        });
      }

      // Create new transport
      const newTransport = new Transport({
        transport,
        created_by: currentUserId,
        updated_by: currentUserId,
      });

      await newTransport.save();

      // Populate user references for response
      await newTransport.populate("created_by", "username");
      await newTransport.populate("updated_by", "username");

      res.status(201).json({
        success: true,
        message: "Transport created successfully",
        data: newTransport,
      });
    } catch (error) {
      console.error("Error creating transport:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Transport already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating transport",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/transports/:id
 * @desc    Update transport
 * @access  Private - requires transports:update permission
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("transports:update"),
  idValidation,
  transportValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { transport } = req.body;
      const currentUserId = getCurrentUserId(req);

      // Check if transport exists
      const existingTransport = await Transport.findById(req.params.id);
      if (!existingTransport) {
        return res.status(404).json({
          success: false,
          message: "Transport not found",
        });
      }

      // Check if new transport name already exists (excluding current transport)
      const duplicateTransport = await Transport.findOne({
        transport,
        _id: { $ne: req.params.id },
      });
      if (duplicateTransport) {
        return res.status(400).json({
          success: false,
          message: "Transport name already exists",
        });
      }

      // Update transport
      const updatedTransport = await Transport.findByIdAndUpdate(
        req.params.id,
        {
          transport,
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
        message: "Transport updated successfully",
        data: updatedTransport,
      });
    } catch (error) {
      console.error("Error updating transport:", error);

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "Transport name already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating transport",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/transports/:id
 * @desc    Delete transport
 * @access  Private - requires transports:delete permission
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("transports:delete"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if transport exists
      const transport = await Transport.findById(req.params.id);
      if (!transport) {
        return res.status(404).json({
          success: false,
          message: "Transport not found",
        });
      }

      // Delete transport
      await Transport.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Transport deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting transport:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting transport",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;