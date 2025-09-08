/**
 * User Routes
 * Pusti Happy Times - User Management Endpoints
 *
 * This file contains all user-related routes including
 * CRUD operations with proper authentication and authorization.
 *
 * Features:
 * - Full CRUD operations for users
 * - Role-based access control
 * - Password management
 * - API permission validation
 * - Audit trail for all operations
 */

const express = require("express");
const { body, validationResult, param } = require("express-validator");
const { User, Role } = require("../models");
const { authenticate, requireApiPermission } = require("../middleware/auth");

const router = express.Router();

/**
 * Validation Rules
 */

// User creation validation rules
const userCreateValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("role_id").isMongoId().withMessage("Invalid role ID format"),

  body("active")
    .optional()
    .isBoolean()
    .withMessage("Active status must be a boolean"),
];

// User update validation rules (password optional)
const userUpdateValidation = [
  body("username")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Username cannot be empty")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("role_id").optional().isMongoId().withMessage("Invalid role ID format"),

  body("active")
    .optional()
    .isBoolean()
    .withMessage("Active status must be a boolean"),
];

// Password change validation
const passwordChangeValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
];

// ID parameter validation
const idValidation = [
  param("id").isMongoId().withMessage("Invalid user ID format"),
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
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private - requires read:user permission
 */
router.get(
  "/",
  authenticate,
  requireApiPermission("read:user"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sort = "username" } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sort]: 1 },
      };

      // Calculate skip value for pagination
      const skip = (options.page - 1) * options.limit;

      // Get users with pagination (exclude passwords)
      const users = await User.find({})
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit)
        .populate("role_id", "role")
        .populate("created_by", "username")
        .populate("updated_by", "username");

      // Get total count for pagination
      const totalCount = await User.countDocuments();
      const totalPages = Math.ceil(totalCount / options.limit);

      res.json({
        success: true,
        data: users,
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
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching users",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private - requires read:user permission
 */
router.get(
  "/:id",
  authenticate,
  requireApiPermission("read:user"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .populate("role_id", "role")
        .populate("created_by", "username")
        .populate("updated_by", "username");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching user",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private - requires create:user permission
 */
router.post(
  "/",
  authenticate,
  requireApiPermission("create:user"),
  userCreateValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password, role_id, active = true } = req.body;
      const currentUserId = getCurrentUserId(req);

      // Verify role exists
      const role = await Role.findById(role_id);
      if (!role) {
        return res.status(400).json({
          success: false,
          message: "Invalid role specified",
        });
      }

      // Check if username or email already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username or email already exists",
        });
      }

      // Create new user
      const newUser = new User({
        username,
        email,
        password,
        role_id,
        active,
        created_by: currentUserId,
        updated_by: currentUserId,
      });

      await newUser.save();

      // Populate references for response (password will be excluded by toJSON)
      await newUser.populate("role_id", "role");
      await newUser.populate("created_by", "username");
      await newUser.populate("updated_by", "username");

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: newUser,
      });
    } catch (error) {
      console.error("Error creating user:", error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error creating user",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private - requires update:user permission
 */
router.put(
  "/:id",
  authenticate,
  requireApiPermission("update:user"),
  idValidation,
  userUpdateValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, role_id, active } = req.body;
      const currentUserId = getCurrentUserId(req);

      // Check if user exists
      const existingUser = await User.findById(req.params.id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Build update object
      const updateData = {
        updated_by: currentUserId,
        updated_at: new Date(),
      };

      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (role_id !== undefined) {
        // Verify role exists
        const role = await Role.findById(role_id);
        if (!role) {
          return res.status(400).json({
            success: false,
            message: "Invalid role specified",
          });
        }
        updateData.role_id = role_id;
      }
      if (active !== undefined) updateData.active = active;

      // Check for duplicate username/email (excluding current user)
      if (username || email) {
        const query = { _id: { $ne: req.params.id } };
        if (username) query.username = username;
        if (email) query.email = email;

        const duplicateUser = await User.findOne({
          $or: [
            username ? { username, _id: { $ne: req.params.id } } : null,
            email ? { email, _id: { $ne: req.params.id } } : null,
          ].filter(Boolean),
        });

        if (duplicateUser) {
          return res.status(400).json({
            success: false,
            message: "Username or email already exists",
          });
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("role_id", "role")
        .populate("created_by", "username")
        .populate("updated_by", "username");

      res.json({
        success: true,
        message: "User updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user:", error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating user",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/users/:id/change-password
 * @desc    Change user password
 * @access  Private - requires change:password permission or own user
 */
router.post(
  "/:id/change-password",
  authenticate,
  idValidation,
  passwordChangeValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const currentUserId = getCurrentUserId(req);
      const targetUserId = req.params.id;

      // Check if user is changing their own password or has permission
      const isOwnPassword = currentUserId.toString() === targetUserId;
      if (!isOwnPassword) {
        // Check if user has change:password permission
        // This will be handled by requireApiPermission middleware if needed
        // For now, allow users to change their own password only
        return res.status(403).json({
          success: false,
          message: "You can only change your own password",
        });
      }

      // Get user with password
      const user = await User.findById(targetUserId).select("+password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isCurrentPasswordValid =
        await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Update password
      user.password = newPassword;
      user.updated_by = currentUserId;
      user.updated_at = new Date();
      await user.save();

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        message: "Error changing password",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private - requires delete:user permission
 */
router.delete(
  "/:id",
  authenticate,
  requireApiPermission("delete:user"),
  idValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const currentUserId = getCurrentUserId(req);

      // Prevent user from deleting themselves
      if (currentUserId.toString() === req.params.id) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account",
        });
      }

      // Check if user exists
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Delete user
      await User.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting user",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
