/**
 * Role-based access control middleware
 */

const User = require("../models/User");
const Role = require("../models/Role");

/**
 * Middleware to require specific role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
const requireRole = (allowedRoles) => {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req, res, next) => {
    try {
      if (!req.userContext || !req.userContext.user_id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const user = await User.findById(req.userContext.user_id)
        .populate("role_id", "name")
        .select("role_id active");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (!user.active) {
        return res.status(403).json({
          success: false,
          message: "User account is inactive",
        });
      }

      const userRole = user.role_id?.name;
      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: "User has no assigned role",
        });
      }

      if (!rolesArray.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${rolesArray.join(", ")}`,
        });
      }

      // Add role to request context
      req.userContext.role = userRole;
      next();
    } catch (error) {
      console.error("Error in requireRole middleware:", error);
      res.status(500).json({
        success: false,
        message: "Error checking user role",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };
};

/**
 * Middleware specifically for Production role
 * Ensures user has Production role, facility_id, and factory_store_id
 */
const requireProductionRole = async (req, res, next) => {
  try {
    console.log("🎭 Checking production role for user:", req.userContext?.user_id);

    if (!req.userContext || !req.userContext.user_id) {
      console.log("❌ No userContext or user_id");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.userContext.user_id)
      .populate("role_id", "role") // Use "role" field instead of "name"
      .populate("employee_id", "employee_type facility_id factory_store_id")
      .select("role_id employee_id active");

    console.log("👤 User found:", user?._id);
    console.log("👤 User role:", user?.role_id);
    console.log("👤 User active:", user?.active);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    const userRole = user.role_id?.role; // Use "role" field instead of "name"
    console.log("🎭 User role name:", userRole);

    if (userRole !== "Production") {
      console.log("❌ Role mismatch - expected Production, got:", userRole);
      return res.status(403).json({
        success: false,
        message: "Access denied. Production role required",
      });
    }

    // Check employee type and facility assignments
    if (!user.employee_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an employee record",
      });
    }

    if (user.employee_id.employee_type !== "facility") {
      return res.status(403).json({
        success: false,
        message: "Production role requires facility employee type",
      });
    }

    if (!user.employee_id.facility_id) {
      return res.status(403).json({
        success: false,
        message: "Production user must be assigned to a facility (Factory)",
      });
    }

    if (!user.employee_id.factory_store_id) {
      return res.status(403).json({
        success: false,
        message: "Production user must have a factory store (Depot) assigned",
      });
    }

    // Add role and facility info to request context
    req.userContext.role = userRole;
    req.userContext.facility_id = user.employee_id.facility_id;
    req.userContext.factory_store_id = user.employee_id.factory_store_id;

    next();
  } catch (error) {
    console.error("Error in requireProductionRole middleware:", error);
    res.status(500).json({
      success: false,
      message: "Error checking production role",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Middleware to check if user has Inventory role
 * Validates role, employee type, and facility assignments
 */
const requireInventoryRole = async (req, res, next) => {
  try {
    console.log("🎭 Checking inventory role for user:", req.userContext.user_id);

    // Get user with role and employee information
    const User = require("../models/User");
    const user = await User.findById(req.userContext.user_id)
      .populate("role_id", "role")
      .populate("employee_id");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("👤 User found:", user._id);
    console.log("👤 User role:", user.role_id);

    if (!user.role_id) {
      return res.status(403).json({
        success: false,
        message: "User has no role assigned",
      });
    }

    const userRole = user.role_id?.role;
    console.log("🎭 User role name:", userRole);

    if (userRole !== "Inventory") {
      console.log("❌ Role mismatch - expected Inventory, got:", userRole);
      return res.status(403).json({
        success: false,
        message: "Access denied. Inventory role required",
      });
    }

    // Check employee type and facility assignments
    if (!user.employee_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an employee record",
      });
    }

    if (user.employee_id.employee_type !== "facility") {
      return res.status(403).json({
        success: false,
        message: "Inventory role requires facility employee type",
      });
    }

    if (!user.employee_id.factory_store_id) {
      return res.status(403).json({
        success: false,
        message: "Inventory user must have a factory store (Depot) assigned",
      });
    }

    // Add role and facility info to request context
    req.userContext.role = userRole;
    req.userContext.facility_store_id = user.employee_id.factory_store_id;
    if (user.employee_id.facility_id) {
      req.userContext.facility_id = user.employee_id.facility_id;
    }

    next();
  } catch (error) {
    console.error("Error in requireInventoryRole middleware:", error);
    res.status(500).json({
      success: false,
      message: "Error checking inventory role",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  requireRole,
  requireProductionRole,
  requireInventoryRole,
};
