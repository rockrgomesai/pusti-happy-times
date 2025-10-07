/**
 * Routes Index
 * Pusti Happy Times - Central Route Configuration
 *
 * This file serves as the central point for configuring and mounting
 * all API routes in the application with proper middleware and
 * organization.
 *
 * Features:
 * - Centralized route mounting
 * - Middleware application per route group
 * - API versioning support
 * - Route documentation and health checks
 */

const express = require("express");
const {
  authenticate,
  requireRole,
  requireApiPermission,
} = require("../middleware/auth");

// Import route modules
const authRoutes = require("./auth");
const userRoutes = require("./users");
const roleRoutes = require("./roles");
const brandRoutes = require("./brands");
const transportRoutes = require("./transports");
const categoryRoutes = require("./categories");
const menuRoutes = require("./menu-items");
const permissionRoutes = require("./permissions");
const designationRoutes = require("./designationRoutes");

const router = express.Router();

/**
 * API Health Check
 * @route   GET /api/health
 * @desc    API health status
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * System Stats (Lightweight)
 * @route   GET /api/stats/summary
 * @desc    Basic aggregate counts for dashboard (cached in-memory per process)
 * @access  Private (authenticated users)
 */
let __lastStatsCache = null;
let __lastStatsAt = 0;

async function buildStatsPayload() {
  const { User, Brand, Role } = require("../models");
  const [userCount, brandCount, roleCount] = await Promise.all([
    User.countDocuments().catch((e) => {
      console.error("[STATS] user count error", e);
      return 0;
    }),
    Brand.countDocuments().catch((e) => {
      console.error("[STATS] brand count error", e);
      return 0;
    }),
    Role.countDocuments().catch((e) => {
      console.error("[STATS] role count error", e);
      return 0;
    }),
  ]);

  const uptimeSeconds = Math.floor(process.uptime());
  const health = uptimeSeconds > 0 ? "OK" : "INIT";

  return {
    users: userCount,
    brands: brandCount,
    roles: roleCount,
    systemHealth: health,
    uptimeSeconds,
    generatedAt: new Date().toISOString(),
  };
}

// Protected (authenticated) detailed stats
router.get("/stats/summary", authenticate, async (req, res) => {
  try {
    const now = Date.now();
    if (__lastStatsCache && now - __lastStatsAt < 15000) {
      console.log("[STATS] cache hit (protected)", {
        user: req.user?.username,
        role: req.user?.role?.role,
      });
      return res.json({ success: true, cached: true, data: __lastStatsCache });
    }
    const data = await buildStatsPayload();
    __lastStatsCache = data;
    __lastStatsAt = now;
    console.log("[STATS] fresh build (protected)", {
      ...data,
      user: req.user?.username,
    });
    res.json({ success: true, cached: false, data });
  } catch (err) {
    console.error("Error building stats summary (protected):", err);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
});

// Public lightweight stats (no auth) - omits uptime for privacy if desired
router.get("/stats/public", async (req, res) => {
  try {
    const now = Date.now();
    if (__lastStatsCache && now - __lastStatsAt < 15000) {
      console.log("[STATS] cache hit (public)");
      return res.json({
        success: true,
        cached: true,
        data: { ...__lastStatsCache },
      });
    }
    const data = await buildStatsPayload();
    __lastStatsCache = data;
    __lastStatsAt = now;
    console.log("[STATS] fresh build (public)");
    res.json({ success: true, cached: false, data });
  } catch (err) {
    console.error("Error building stats summary (public):", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch public stats" });
  }
});

/**
 * API Information
 * @route   GET /api/info
 * @desc    API information and documentation
 * @access  Public
 */
router.get("/info", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "Pusti Happy Times API",
      version: process.env.APP_VERSION || "1.0.0",
      description: "Backend API for Pusti Happy Times MERN application",
      environment: process.env.NODE_ENV || "development",
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        roles: "/api/roles",
        brands: "/api/brands",
  categories: "/api/categories",
        menu: "/api/menu-items",
        permissions: "/api/permissions",
      },
      features: [
        "JWT Authentication",
        "Role-based Access Control",
        "Three-tier Permission System",
        "MongoDB Integration",
        "Redis Caching",
        "Request Rate Limiting",
        "Comprehensive Logging",
      ],
    },
  });
});

/**
 * Authentication Routes
 * No authentication required for these routes
 */
router.use("/auth", authRoutes);

/**
 * Protected Routes
 * All routes below require authentication
 */

// Apply authentication middleware to all subsequent routes
router.use(authenticate);

/**
 * User Management Routes
 * @route   /api/users/*
 * @desc    User CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/users", userRoutes);

/**
 * Role Management Routes
 * @route   /api/roles/*
 * @desc    Role CRUD operations and permission management
 * @access  Private (admin roles only)
 */
router.use("/roles", requireRole("SuperAdmin", "SalesAdmin"), roleRoutes);

/**
 * Brand Management Routes
 * @route   /api/brands/*
 * @desc    Brand CRUD operations and hierarchy management
 * @access  Private (authenticated users)
 */
router.use("/brands", brandRoutes);

/**
 * Designation Management Routes
 * @route   /api/designations/*
 * @desc    Job designation CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/designations", designationRoutes);

/**
 * Transport Management Routes
 * @route   /api/transports/*
 * @desc    Transport CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/transports", transportRoutes);

router.use("/categories", categoryRoutes);

/**
 * Menu Management Routes
 * @route   /api/menu-items/*
 * @desc    Sidebar menu CRUD operations and navigation
 * @access  Private (authenticated users)
 */
router.use("/menu-items", menuRoutes);

/**
 * Permission Management Routes
 * @route   /api/permissions/*
 * @desc    Permission CRUD operations and access control
 * @access  Private (admin roles only)
 */
router.use("/permissions", requireRole("SuperAdmin"), permissionRoutes);

/**
 * API Route Documentation Helper
 * @route   GET /api/routes
 * @desc    List all available API routes
 * @access  Private (authenticated users)
 */
router.get("/routes", (req, res) => {
  const routes = [];

  // Helper function to extract routes from router
  function extractRoutes(stack, basePath = "") {
    stack.forEach((layer) => {
      if (layer.route) {
        // Direct route
        const methods = Object.keys(layer.route.methods);
        routes.push({
          path: basePath + layer.route.path,
          methods: methods.map((m) => m.toUpperCase()),
          middleware: layer.route.stack?.length || 0,
        });
      } else if (layer.regexp) {
        // Router middleware
        const match = layer.regexp.source.match(/\^\\?\/([^\\]+)/);
        if (match && layer.handle.stack) {
          const subPath = match[1].replace(/\\\//g, "/");
          extractRoutes(layer.handle.stack, basePath + "/" + subPath);
        }
      }
    });
  }

  try {
    extractRoutes(router.stack, "/api");

    res.json({
      success: true,
      data: {
        totalRoutes: routes.length,
        routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        message: "Route extraction not available",
        availableEndpoints: {
          auth: "/api/auth",
          users: "/api/users",
          roles: "/api/roles",
          brands: "/api/brands",
          menu: "/api/menu",
          permissions: "/api/permissions",
        },
      },
    });
  }
});

/**
 * Catch-all for undefined API routes
 * @route   * /api/*
 * @desc    Handle undefined API endpoints
 * @access  Public
 */
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    code: "ENDPOINT_NOT_FOUND",
    suggestion: "Check /api/routes for available endpoints",
  });
});

/**
 * Error handling middleware for API routes
 */
router.use((error, req, res, next) => {
  console.error("API Error:", error);

  // Handle different types of errors
  let statusCode = 500;
  let message = "Internal server error";
  let code = "SERVER_ERROR";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
    code = "INVALID_ID";
  } else if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate entry";
    code = "DUPLICATE_ENTRY";
  } else if (error.name === "UnauthorizedError") {
    statusCode = 401;
    message = "Unauthorized access";
    code = "UNAUTHORIZED";
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: error.message,
    }),
  });
});

module.exports = router;
