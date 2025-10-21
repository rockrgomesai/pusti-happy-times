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

const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const redis = require('../config/redis');

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
    return jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET,
      { 
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        issuer: process.env.JWT_ISSUER || 'pusti-ht',
        audience: process.env.JWT_AUDIENCE || 'pusti-ht-users'
      }
    );
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      { 
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'pusti-ht',
        audience: process.env.JWT_AUDIENCE || 'pusti-ht-users'
      }
    );
  }

  /**
   * Verify access token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: process.env.JWT_ISSUER || 'pusti-ht',
      audience: process.env.JWT_AUDIENCE || 'pusti-ht-users'
    });
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: process.env.JWT_ISSUER || 'pusti-ht',
      audience: process.env.JWT_AUDIENCE || 'pusti-ht-users'
    });
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} user - User document
   * @param {Object} contextData - Additional context data (employee/distributor info)
   * @returns {Object} Object containing access and refresh tokens
   */
  static generateTokenPair(user, contextData = {}) {
    const payload = {
      userId: user._id,
      username: user.username,
      roleId: user.role_id,
      tokenType: 'access',
      
      // User type and token version
      user_type: user.user_type,
      tokenVersion: user.tokenVersion || 0
    };

    // Add employee context
    if (user.user_type === 'employee') {
      payload.employee_id = user.employee_id?._id || user.employee_id;
      payload.employee_type = contextData.employee_type;
      payload.employee_code = contextData.employee_code;
      
      // Add context based on employee_type
      if (contextData.employee_type === 'field' && contextData.territory_assignments) {
        payload.territory_assignments = contextData.territory_assignments;
      }
      
      if (contextData.employee_type === 'facility' && contextData.facility_assignments) {
        payload.facility_assignments = contextData.facility_assignments;
      }
      
      if (contextData.employee_type === 'hq' && contextData.department) {
        payload.department = contextData.department;
      }
    }

    // Add distributor context
    if (user.user_type === 'distributor') {
      payload.distributor_id = user.distributor_id?._id || user.distributor_id;
      payload.distributor_name = contextData.distributor_name;
      payload.db_point_id = contextData.db_point_id;
      payload.product_segment = contextData.product_segment;
    }

    const refreshPayload = {
      userId: user._id,
      username: user.username,
      tokenType: 'refresh',
      tokenVersion: user.tokenVersion || 0
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(refreshPayload),
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      tokenType: 'Bearer'
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = TokenManager.verifyAccessToken(token);
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid access token',
          code: 'TOKEN_INVALID'
        });
      }
      throw tokenError;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Load user with role information
    const user = await User.findById(decoded.userId)
      .populate('role_id')
      .populate('employee_id')
      .populate('distributor_id')
      .select('+lastLogin +lastLoginIP');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check token version
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated',
        code: 'TOKEN_VERSION_MISMATCH'
      });
    }

    // Check if user account is active
    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }

    // Check if role is active
    if (!user.role_id || !user.role_id.active) {
      return res.status(403).json({
        success: false,
        message: 'User role is inactive',
        code: 'ROLE_INACTIVE'
      });
    }

    // Attach user and token info to request
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    // Attach user context for authorization checks
    req.userContext = {
      user_type: decoded.user_type,
      employee_type: decoded.employee_type,
      employee_id: decoded.employee_id,
      distributor_id: decoded.distributor_id,
      territory_assignments: decoded.territory_assignments,
      facility_assignments: decoded.facility_assignments,
      department: decoded.department,
      db_point_id: decoded.db_point_id,
      product_segment: decoded.product_segment
    };

    // Update last activity timestamp in Redis
    await redis.updateUserActivity(user._id.toString());

    next();
  } catch (error) {
    console.error('Authentication error:', error.name || 'UnknownError');
    console.error('Error message:', error.message);
    console.error('Error at:', error.stack?.split('\n')[1]?.trim());
    
    // Don't expose detailed error information to client
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role_id?.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
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
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
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
          message: 'Permission denied',
          code: 'PERMISSION_DENIED',
          required: permissionCode,
          type: permissionType
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * API Permission Middleware
 * Checks API-specific permissions based on permission code
 */
const requireApiPermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasPermission = await checkApiPermission(
        req.user,
        permissionCode
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'API access denied',
          code: 'API_ACCESS_DENIED',
          permission: permissionCode
        });
      }

      next();
    } catch (error) {
      console.error('API permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'API permission check failed',
        code: 'API_PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Self-only Access Middleware
 * Ensures user can only access their own data
 */
const requireSelfOnly = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const requestedUserId = req.params[userIdParam];
    const currentUserId = req.user._id.toString();

    if (requestedUserId !== currentUserId) {
      // Check if user has admin privileges
      const userRole = req.user.role_id?.name;
      if (!['SuperAdmin', 'SalesAdmin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: can only access own data',
          code: 'SELF_ACCESS_ONLY'
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
 * Require specific user type
 * @param {...string} allowedTypes - Allowed user types ('employee', 'distributor')
 */
const requireUserType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.userContext) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedTypes.includes(req.userContext.user_type)) {
      return res.status(403).json({
        success: false,
        message: 'User type not authorized',
        code: 'USER_TYPE_FORBIDDEN',
        required: allowedTypes,
        current: req.userContext.user_type
      });
    }

    next();
  };
};

/**
 * Require specific employee type (only for employee users)
 * @param {...string} allowedTypes - Allowed employee types ('system_admin', 'field', 'facility', 'hq')
 */
const requireEmployeeType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.userContext || req.userContext.user_type !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Employee account required',
        code: 'EMPLOYEE_REQUIRED'
      });
    }

    if (!allowedTypes.includes(req.userContext.employee_type)) {
      return res.status(403).json({
        success: false,
        message: 'Employee type not authorized',
        code: 'EMPLOYEE_TYPE_FORBIDDEN',
        required: allowedTypes,
        current: req.userContext.employee_type
      });
    }

    next();
  };
};

/**
 * Require territory access (for field employees)
 * @param {string} territoryIdParam - Name of parameter or body field containing territory ID
 */
const requireTerritoryAccess = (territoryIdParam = 'territoryId') => {
  return (req, res, next) => {
    // System admins bypass territory restrictions
    if (req.userContext?.employee_type === 'system_admin') {
      return next();
    }

    if (!req.userContext || req.userContext.employee_type !== 'field') {
      return res.status(403).json({
        success: false,
        message: 'Field employee account required',
        code: 'FIELD_EMPLOYEE_REQUIRED'
      });
    }

    const requestedTerritoryId = req.params[territoryIdParam] || req.body[territoryIdParam];
    const assignments = req.userContext.territory_assignments;
    
    if (!assignments || !assignments.all_territory_ids) {
      return res.status(403).json({
        success: false,
        message: 'No territory assignments found',
        code: 'NO_TERRITORY_ASSIGNMENTS'
      });
    }

    const hasAccess = assignments.all_territory_ids.some(
      id => id.toString() === requestedTerritoryId
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Territory access denied',
        code: 'TERRITORY_ACCESS_DENIED'
      });
    }

    next();
  };
};

/**
 * Require facility access (for facility employees)
 * @param {string} facilityIdParam - Name of parameter or body field containing facility ID
 * @param {string} facilityType - Optional: 'factory' or 'depot' to restrict type
 */
const requireFacilityAccess = (facilityIdParam = 'facilityId', facilityType = null) => {
  return (req, res, next) => {
    // System admins bypass facility restrictions
    if (req.userContext?.employee_type === 'system_admin') {
      return next();
    }

    if (!req.userContext || req.userContext.employee_type !== 'facility') {
      return res.status(403).json({
        success: false,
        message: 'Facility employee account required',
        code: 'FACILITY_EMPLOYEE_REQUIRED'
      });
    }

    const requestedFacilityId = req.params[facilityIdParam] || req.body[facilityIdParam];
    const assignments = req.userContext.facility_assignments;
    
    if (!assignments) {
      return res.status(403).json({
        success: false,
        message: 'No facility assignments found',
        code: 'NO_FACILITY_ASSIGNMENTS'
      });
    }

    let hasAccess = false;
    
    if (!facilityType || facilityType === 'factory') {
      hasAccess = hasAccess || (assignments.factory_ids || []).some(
        id => id.toString() === requestedFacilityId
      );
    }
    
    if (!facilityType || facilityType === 'depot') {
      hasAccess = hasAccess || (assignments.depot_ids || []).some(
        id => id.toString() === requestedFacilityId
      );
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Facility access denied',
        code: 'FACILITY_ACCESS_DENIED'
      });
    }

    next();
  };
};

/**
 * Require department access (for hq employees)
 * @param {...string} allowedDepartments - Allowed departments
 */
const requireDepartment = (...allowedDepartments) => {
  return (req, res, next) => {
    // System admins bypass department restrictions
    if (req.userContext?.employee_type === 'system_admin') {
      return next();
    }

    if (!req.userContext || req.userContext.employee_type !== 'hq') {
      return res.status(403).json({
        success: false,
        message: 'HQ employee account required',
        code: 'HQ_EMPLOYEE_REQUIRED'
      });
    }

    if (!allowedDepartments.includes(req.userContext.department)) {
      return res.status(403).json({
        success: false,
        message: 'Department access denied',
        code: 'DEPARTMENT_ACCESS_DENIED',
        required: allowedDepartments,
        current: req.userContext.department
      });
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
    const { 
      RoleMenuPermission, 
      RolePagePermission, 
      RoleApiPermission 
    } = require('../models/JunctionTables');

    let JunctionModel;
    let permissionField;

    // Determine which junction table to use
    switch (permissionType.toLowerCase()) {
      case 'menu':
        JunctionModel = RoleMenuPermission;
        permissionField = 'menu_permission_id';
        break;
      case 'page':
        JunctionModel = RolePagePermission;
        permissionField = 'page_permission_id';
        break;
      case 'api':
        JunctionModel = RoleApiPermission;
        permissionField = 'api_permission_id';
        break;
      default:
        return false;
    }

    // Find permission by code
    const { MenuPermission, PagePermission, ApiPermission } = require('../models/Permission');
    let PermissionModel;

    switch (permissionType.toLowerCase()) {
      case 'menu':
        PermissionModel = MenuPermission;
        break;
      case 'page':
        PermissionModel = PagePermission;
        break;
      case 'api':
        PermissionModel = ApiPermission;
        break;
    }

    const permission = await PermissionModel.findOne({ 
      code: permissionCode, 
      active: true 
    });

    if (!permission) {
      return false;
    }

    // Check if role has this permission
    const rolePermission = await JunctionModel.findOne({
      role_id: user.role_id._id,
      [permissionField]: permission._id,
      active: true
    });

    return rolePermission ? rolePermission.isValid() : false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Check API permission with method validation
 * @param {Object} user - User document with role populated
 * @param {string} permissionCode - Permission code like 'users:read', 'roles:create'
 * @param {string} method - HTTP method (optional, not used in current schema)
 * @returns {Promise<boolean>} True if user has permission
 */
async function checkApiPermission(user, permissionCode, method) {
  try {
    const { ApiPermission } = require('../models/Permission');
    const { RoleApiPermission } = require('../models/JunctionTables');

    // Find API permission by permission code
    const apiPermission = await ApiPermission.findOne({
      api_permissions: permissionCode
    });

    if (!apiPermission) {
      console.log(`Permission '${permissionCode}' not found in api_permissions`);
      return false;
    }

    // Check if role has this API permission
    const rolePermission = await RoleApiPermission.findOne({
      role_id: user.role_id._id,
      api_permission_id: apiPermission._id
    });

    if (!rolePermission) {
      console.log(`Role ${user.role_id._id} does not have permission '${permissionCode}'`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('API permission check error:', error);
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

  // New context-aware authorization middleware
  requireUserType,
  requireEmployeeType,
  requireTerritoryAccess,
  requireFacilityAccess,
  requireDepartment,

  // Utility functions
  checkUserPermission,
  checkApiPermission
};
