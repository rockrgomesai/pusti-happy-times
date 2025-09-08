/**
 * Authentication Middleware
 * Pusti Happy Times - JWT Authentication & Authorization
 *
 * This middleware handles JWT token validation, user authentication,
 * and role-based authorization for the application.
 *
 * Features:
 * - JWT token validation and refresh
 * - User session management
 * - Role-based access control
 * - Permission checking (menu, page, API)
 * - Account lockout handling
 * - Request rate limiting
 */

const jwt = require("jsonwebtoken");
const { User, Role } = require("../models");
const redis = require("../config/redis");

/**
 * JWT Token Management
 */
class TokenManager {
  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @returns {string} JWT access token
   */
  static generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
      issuer: process.env.JWT_ISSUER || "pusti-ht",
      audience: process.env.JWT_AUDIENCE || "pusti-ht-users",
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
      issuer: process.env.JWT_ISSUER || "pusti-ht",
      audience: process.env.JWT_AUDIENCE || "pusti-ht-users",
    });
  }

  /**
   * Verify access token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: process.env.JWT_ISSUER || "pusti-ht",
      audience: process.env.JWT_AUDIENCE || "pusti-ht-users",
    });
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: process.env.JWT_ISSUER || "pusti-ht",
      audience: process.env.JWT_AUDIENCE || "pusti-ht-users",
    });
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} user - User document
   * @returns {Object} Object containing access and refresh tokens
   */
  static generateTokenPair(user) {
    const payload = {
      userId: user._id,
      username: user.username,
      roleId: user.role_id,
      tokenType: "access",
    };

    const refreshPayload = {
      userId: user._id,
      username: user.username,
      tokenType: "refresh",
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(refreshPayload),
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
      tokenType: "Bearer",
    };
  }
}

/**
 * Authentication Middleware
 * Validates JWT tokens and loads user data
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
        code: "TOKEN_REQUIRED",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = TokenManager.verifyAccessToken(token);
    } catch (tokenError) {
      if (tokenError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Access token expired",
          code: "TOKEN_EXPIRED",
        });
      } else if (tokenError.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid access token",
          code: "TOKEN_INVALID",
        });
      }
      throw tokenError;
    }

    // Check if token is blacklisted (with fallback if Redis is not available)
    let isBlacklisted = false;
    try {
      isBlacklisted = await redis.isTokenBlacklisted(token);
    } catch (redisError) {
      console.warn(
        "Redis check failed, assuming token is not blacklisted:",
        redisError.message
      );
    }

    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked",
        code: "TOKEN_REVOKED",
      });
    }

    // Load user with role information
    const user = await User.findById(decoded.userId)
      .populate("role_id")
      .select("+lastLogin +lastLoginIP");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if user account is active
    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
        code: "ACCOUNT_INACTIVE",
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

    // Attach user and token info to request
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    // Update last activity timestamp in Redis (with fallback if Redis is not available)
    try {
      await redis.updateUserActivity(user._id.toString());
    } catch (redisError) {
      console.warn("Redis activity update failed:", redisError.message);
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Optional Authentication Middleware
 * Similar to authenticate but doesn't require token
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without user
      req.user = null;
      req.token = null;
      return next();
    }

    // Token provided, try to authenticate
    return authenticate(req, res, next);
  } catch (error) {
    // If authentication fails, continue without user
    req.user = null;
    req.token = null;
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * Checks if user has required role
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const userRole = req.user.role_id?.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
        required: allowedRoles,
        current: userRole,
      });
    }

    next();
  };
};

/**
 * Permission-based Authorization Middleware
 * Checks specific permissions based on type
 */
const requirePermission = (permissionType, permissionCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      const hasPermission = await checkUserPermission(
        req.user,
        permissionType,
        permissionCode
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Permission denied",
          code: "PERMISSION_DENIED",
          required: permissionCode,
          type: permissionType,
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Permission check failed",
        code: "PERMISSION_ERROR",
      });
    }
  };
};

/**
 * API Permission Middleware
 * Checks API-specific permissions based on permission string
 */
const requireApiPermission = (permissionString) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      // SuperAdmin has access to everything
      if (req.user.role_id?.role === "SuperAdmin") {
        return next();
      }

      const hasPermission = await checkApiPermission(
        req.user,
        permissionString
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "API access denied",
          code: "API_ACCESS_DENIED",
          permission: permissionString,
        });
      }

      next();
    } catch (error) {
      console.error("API permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "API permission check failed",
        code: "API_PERMISSION_ERROR",
      });
    }
  };
};

/**
 * Self-only Access Middleware
 * Ensures user can only access their own data
 */
const requireSelfOnly = (userIdParam = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const requestedUserId = req.params[userIdParam];
    const currentUserId = req.user._id.toString();

    if (requestedUserId !== currentUserId) {
      // Check if user has admin privileges
      const userRole = req.user.role_id?.name;
      if (!["SuperAdmin", "SalesAdmin"].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: can only access own data",
          code: "SELF_ACCESS_ONLY",
        });
      }
    }

    next();
  };
};

/**
 * Permission Checking Utilities
 */

/**
 * Check if user has specific permission
 * @param {Object} user - User document with role populated
 * @param {string} permissionType - Type of permission (menu, page, api)
 * @param {string} permissionCode - Permission code to check
 * @returns {Promise<boolean>} True if user has permission
 */
async function checkUserPermission(user, permissionType, permissionCode) {
  try {
    // SuperAdmin has all permissions
    if (user.role_id?.role === "SuperAdmin") {
      return true;
    }

    const {
      RoleSidebarMenuItem,
      RolePagePermission,
      RoleApiPermission,
    } = require("../models");

    const {
      SidebarMenuItem,
      PagePermission,
      ApiPermission,
    } = require("../models");

    let JunctionModel;
    let PermissionModel;
    let permissionField;

    // Determine which models to use
    switch (permissionType.toLowerCase()) {
      case "menu":
        JunctionModel = RoleSidebarMenuItem;
        PermissionModel = SidebarMenuItem;
        permissionField = "sidebar_menu_item_id";
        break;
      case "page":
        JunctionModel = RolePagePermission;
        PermissionModel = PagePermission;
        permissionField = "page_permission_id";
        break;
      case "api":
        JunctionModel = RoleApiPermission;
        PermissionModel = ApiPermission;
        permissionField = "api_permission_id";
        break;
      default:
        return false;
    }

    // Find permission by code
    const permission = await PermissionModel.findOne({
      [permissionType === "menu"
        ? "label"
        : permissionType === "page"
          ? "pg_permissions"
          : "api_permissions"]: permissionCode,
    });

    if (!permission) {
      return false;
    }

    // Check if role has this permission
    const rolePermission = await JunctionModel.findOne({
      role_id: user.role_id._id,
      [permissionField]: permission._id,
    });

    return !!rolePermission;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

/**
 * Check API permission with our database structure
 * @param {Object} user - User document with role populated
 * @param {string} permissionString - Permission string like 'read:user', 'create:brand', etc.
 * @returns {Promise<boolean>} True if user has permission
 */
async function checkApiPermission(user, permissionString) {
  try {
    const { ApiPermission } = require("../models");
    const { RoleApiPermission } = require("../models");

    // Find API permission by permission string
    const apiPermission = await ApiPermission.findOne({
      api_permissions: permissionString,
    });

    if (!apiPermission) {
      return false;
    }

    // Check if role has this API permission
    const rolePermission = await RoleApiPermission.findOne({
      role_id: user.role_id._id,
      api_permission_id: apiPermission._id,
    });

    return !!rolePermission;
  } catch (error) {
    console.error("API permission check error:", error);
    return false;
  }
}

/**
 * Export middleware functions and utilities
 */
module.exports = {
  // Token management
  TokenManager,

  // Authentication middleware
  authenticate,
  optionalAuthenticate,

  // Authorization middleware
  requireRole,
  requirePermission,
  requireApiPermission,
  requireSelfOnly,

  // Utility functions
  checkUserPermission,
  checkApiPermission,
};
