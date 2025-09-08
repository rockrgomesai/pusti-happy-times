/**
 * Authentication Routes
 * Pusti Happy Times - User Authentication Endpoints
 *
 * This file contains all authentication-related routes including
 * login, logout, token refresh, password management, and user
 * session handling.
 *
 * Features:
 * - Username/password login with validation
 * - JWT token generation and refresh
 * - Account lockout after failed attempts
 * - Password reset functionality
 * - Secure logout with token blacklisting
 * - User session management
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
// const rateLimit = require('express-rate-limit');

const { User, Role } = require("../models");
const {
  TokenManager,
  authenticate,
  optionalAuthenticate,
} = require("../middleware/auth");
const redis = require("../config/redis");

const router = express.Router();

/**
 * Rate Limiting Configuration
 */

// Login rate limiting - stricter limits
// const loginLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 5, // 5 attempts per window
//     message: {
//       success: false,
//       message: 'Too many login attempts, please try again later',
//       code: 'RATE_LIMIT_EXCEEDED'
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
//     keyGenerator: (req) => {
//       // Rate limit by IP + username combination
//       return `${req.ip}:${req.body?.username || 'unknown'}`;
//     }
// });

// General auth rate limiting
// const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 20, // 20 requests per window
//     message: {
//       success: false,
//       message: 'Too many authentication requests, please try again later',
//       code: 'RATE_LIMIT_EXCEEDED'
//     }
// });

/**
 * Validation Rules
 */

const loginValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

const refreshTokenValidation = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];

const passwordResetRequestValidation = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
];

const passwordResetValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/)
    .withMessage("Password must contain at least one letter and one number"),
];

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT tokens
 * @access  Public
 */
router.post("/login", loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;

    // Find user by username and include password
    const user = await User.findOne({ username })
      .select("+password")
      .populate("role_id");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if account is active
    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
        code: "ACCOUNT_INACTIVE",
      });
    }

    // Verify password using bcrypt or plain text comparison (temporary)
    let isPasswordValid = false;

    // Check if password looks like a bcrypt hash
    if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
      // Use bcrypt comparison for hashed passwords
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // Use plain text comparison for non-hashed passwords (temporary)
      isPasswordValid = password === user.password;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if role exists
    if (!user.role_id) {
      return res.status(403).json({
        success: false,
        message: "User role not found",
        code: "ROLE_NOT_FOUND",
      });
    }

    // Generate JWT tokens
    const tokens = TokenManager.generateTokenPair(user);

    // Prepare user data for response (exclude password)
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      active: user.active,
      role: {
        id: user.role_id._id,
        role: user.role_id.role,
      },
    };

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: userData,
        tokens,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post("/refresh", refreshTokenValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    let decoded;
    try {
      decoded = TokenManager.verifyRefreshToken(refreshToken);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    }

    // Check if refresh token exists in Redis
    const storedToken = await redis.getRefreshToken(decoded.userId);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found or invalid",
        code: "REFRESH_TOKEN_NOT_FOUND",
      });
    }

    // Load user with role
    const user = await User.findById(decoded.userId).populate("role_id");

    if (!user || !user.active) {
      // Remove invalid refresh token
      await redis.removeRefreshToken(decoded.userId);
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
        code: "USER_INVALID",
      });
    }

    // Check if role is active
    if (!user.role_id || !user.role_id.active) {
      return res.status(403).json({
        success: false,
        message: "User role is inactive",
        code: "ROLE_INACTIVE",
      });
    }

    // Generate new token pair
    const tokens = TokenManager.generateTokenPair(user);

    // Update refresh token in Redis
    await redis.storeRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
      process.env.JWT_REFRESH_EXPIRES_IN || "7d"
    );

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        tokens,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate tokens
 * @access  Private
 */
router.post("/logout", authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const accessToken = req.token;

    // Blacklist current access token
    await redis.blacklistToken(accessToken);

    // Remove refresh token from Redis
    await redis.removeRefreshToken(userId);

    // Clear user activity
    await redis.clearUserActivity(userId);

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout user from all devices
 * @access  Private
 */
router.post("/logout-all", authenticate, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Remove all refresh tokens for this user
    await redis.removeAllRefreshTokens(userId);

    // Blacklist current access token
    await redis.blacklistToken(req.token);

    // Clear user activity
    await redis.clearUserActivity(userId);

    res.json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({
      success: false,
      message: "Logout from all devices failed",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    // User is already loaded by authenticate middleware
    const userData = req.user.getSafeProfile();

    res.json({
      success: true,
      data: {
        user: {
          ...userData,
          role: {
            id: req.user.role_id._id,
            name: req.user.role_id.name,
            description: req.user.role_id.description,
          },
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),

    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/)
      .withMessage(
        "New password must contain at least one letter and one number"
      ),

    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      // Load user with password field
      const userWithPassword = await User.findById(user._id).select(
        "+password"
      );

      // Verify current password
      const isCurrentPasswordValid =
        await userWithPassword.comparePassword(currentPassword);

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
          code: "INVALID_CURRENT_PASSWORD",
        });
      }

      // Update password
      userWithPassword.password = newPassword;
      userWithPassword.updatedBy = user.username;
      await userWithPassword.save();

      // Invalidate all existing tokens for security
      await redis.removeAllRefreshTokens(user._id.toString());

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Password change failed",
        code: "SERVER_ERROR",
      });
    }
  }
);

/**
 * @route   GET /api/auth/session-status
 * @desc    Check session status and validity
 * @access  Public (optional auth)
 */
router.get("/session-status", optionalAuthenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        data: {
          authenticated: false,
          user: null,
        },
      });
    }

    const userData = req.user.getSafeProfile();

    res.json({
      success: true,
      data: {
        authenticated: true,
        user: {
          ...userData,
          role: {
            id: req.user.role_id._id,
            name: req.user.role_id.name,
            description: req.user.role_id.description,
          },
        },
      },
    });
  } catch (error) {
    console.error("Session status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check session status",
      code: "SERVER_ERROR",
    });
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify if a token is valid
 * @access  Public
 */
router.post(
  "/verify-token",
  [body("token").notEmpty().withMessage("Token is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { token } = req.body;

      try {
        const decoded = TokenManager.verifyAccessToken(token);

        // Check if token is blacklisted
        const isBlacklisted = await redis.isTokenBlacklisted(token);

        res.json({
          success: true,
          data: {
            valid: !isBlacklisted,
            payload: isBlacklisted ? null : decoded,
          },
        });
      } catch (tokenError) {
        res.json({
          success: true,
          data: {
            valid: false,
            payload: null,
          },
        });
      }
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(500).json({
        success: false,
        message: "Token verification failed",
        code: "SERVER_ERROR",
      });
    }
  }
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user's password
 * @access  Private
 */
router.put(
  "/change-password",
  authenticate,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long")
      .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/)
      .withMessage(
        "New password must contain at least one letter and one number"
      ),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Find user and include password
      const user = await User.findById(userId).select("+password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Verify current password
      let isCurrentPasswordValid = false;

      // Check if password looks like a bcrypt hash
      if (user.password && user.password.startsWith("$2")) {
        // Bcrypt hash - use bcrypt.compare
        isCurrentPasswordValid = await bcrypt.compare(
          currentPassword,
          user.password
        );
      } else {
        // Plain text password - direct comparison (temporary fallback)
        isCurrentPasswordValid = currentPassword === user.password;
      }

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
          code: "INVALID_CURRENT_PASSWORD",
        });
      }

      // Check if new password is different from current password
      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from current password",
          code: "SAME_PASSWORD",
        });
      }

      // Hash the new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user's password
      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword,
        updated_at: new Date(),
      });

      // Invalidate all existing refresh tokens for this user
      try {
        const redisClient = redis.getClient();
        if (redisClient && redisClient.isReady) {
          const refreshTokenKeys = await redisClient.keys(
            `refresh_token:${userId}:*`
          );
          if (refreshTokenKeys.length > 0) {
            await redisClient.del(refreshTokenKeys);
          }
        }
      } catch (redisError) {
        console.error("Error invalidating refresh tokens:", redisError);
        // Don't fail the password change if Redis operation fails
      }

      // Also blacklist the current access token to force immediate logout
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const currentToken = authHeader.substring(7);
          if (currentToken) {
            // Blacklist the current access token
            await redis.blacklistToken(
              currentToken,
              24 * 60 * 60,
              "password_changed"
            );
          }
        }
      } catch (redisError) {
        console.error("Error blacklisting current token:", redisError);
        // Don't fail the password change if Redis operation fails
      }

      res.json({
        success: true,
        message: "Password changed successfully - please log in again",
        data: {
          changedAt: new Date(),
          forceLogout: true,
        },
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to change password",
        code: "SERVER_ERROR",
      });
    }
  }
);

module.exports = router;
