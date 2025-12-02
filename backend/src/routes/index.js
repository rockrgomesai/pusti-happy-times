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
const { authenticate, requireRole, requireApiPermission } = require("../middleware/auth");

// Import route modules
const authRoutes = require("./auth");
const userRoutes = require("./users");
const roleRoutes = require("./roles");
const brandRoutes = require("./brands");
const categoryRoutes = require("./categories");
const facilityRoutes = require("./facilities"); // Unified facility routes
const transportRoutes = require("./transports");
const bankRoutes = require("./master/banks");
const bdBankRoutes = require("./master/bd-banks");
const menuRoutes = require("./menu-items");
const permissionRoutes = require("./permissions");
const designationRoutes = require("./designationRoutes");
const employeeRoutes = require("./employees");
const productRoutes = require("./product/products");
const offersRoutes = require("./product/offers");
const territoryRoutes = require("./territories");
const distributorRoutes = require("./distributors");
const notificationRoutes = require("./notifications");
const productionSendToStoreRoutes = require("./production/sendToStore");
const inventoryFactoryToStoreRoutes = require("./inventory/factoryToStore");
const inventoryLocalStockRoutes = require("./inventory/localStock");
const inventoryRequisitionsRoutes = require("./inventory/requisitions");
const depotTransfersRoutes = require("./inventory/depot-transfers");
const customerLedgerRoutes = require("./finance/customerledger");
const demandOrdersRoutes = require("./ordermanagement/demandorders");
const collectionsRoutes = require("./ordermanagement/collections");
const schedulingsRoutes = require("./ordermanagement/schedulings");
const offerSendItemsRoutes = require("./offers/sendItems");
const offerReceiveItemsRoutes = require("./offers/receiveItems");
const distributionRoutes = require("./distribution");
const distributorPortalRoutes = require("./distributor");

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
  const { User, Brand, Role, Territory } = require("../models");
  const [userCount, brandCount, roleCount, territoryCount] = await Promise.all([
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
    Territory.countDocuments().catch((e) => {
      console.error("[STATS] territory count error", e);
      return 0;
    }),
  ]);

  const uptimeSeconds = Math.floor(process.uptime());
  const health = uptimeSeconds > 0 ? "OK" : "INIT";

  return {
    users: userCount,
    brands: brandCount,
    roles: roleCount,
    territories: territoryCount,
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
    res.status(500).json({ success: false, message: "Failed to fetch public stats" });
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
        auth: "/api/v1/auth",
        users: "/api/v1/users",
        roles: "/api/v1/roles",
        brands: "/api/v1/brands",
        categories: "/api/v1/categories",
        products: "/api/v1/products",
        facilities: "/api/v1/facilities",
        employees: "/api/v1/employees",
        menu: "/api/v1/menu-items",
        permissions: "/api/v1/permissions",
        territories: "/api/v1/territories",
        distributors: "/api/v1/distributors",
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
router.use("/categories", categoryRoutes);
router.use("/product/products", productRoutes);
router.use("/products", productRoutes);
router.use("/product/offers", offersRoutes);

/**
 * Facility Management Routes (Unified Depots & Factories)
 * @route   /api/facilities/*
 * @desc    Unified facility CRUD operations (depots and factories)
 * @access  Private (authenticated users)
 */
router.use("/facilities", facilityRoutes);

/**
 * Bank Management Routes
 * @route   /api/master/banks/*
 * @desc    Bank CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/master/banks", bankRoutes);

/**
 * BD Banks Management Routes
 * @route   /api/master/bd-banks/*
 * @desc    Bangladesh banks CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/master/bd-banks", bdBankRoutes);

/**
 * Designation Management Routes
 * @route   /api/designations/*
 * @desc    Job designation CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/designations", designationRoutes);

/**
 * Employee Management Routes
 * @route   /api/employees/*
 * @desc    Employee CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/employees", employeeRoutes);

/**
 * Territory Management Routes
 * @route   /api/territories/*
 * @desc    Hierarchical territory CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/territories", territoryRoutes);

/**
 * Distributor Management Routes
 * @route   /api/distributors/*
 * @desc    Distributor CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/distributors", distributorRoutes);

/**
 * Transport Management Routes
 * @route   /api/transports/*
 * @desc    Transport CRUD operations and management
 * @access  Private (authenticated users)
 */
router.use("/transports", transportRoutes);

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
 * Notification Routes
 * @route   /api/notifications/*
 * @desc    User notifications and alerts
 * @access  Private (authenticated users)
 */
router.use("/notifications", notificationRoutes);

/**
 * Production Routes
 * @route   /api/production/*
 * @desc    Production module operations (Send to Store, etc.)
 * @access  Private (Production role only)
 */
router.use("/production/send-to-store", productionSendToStoreRoutes);

/**
 * Inventory Routes
 * @route   /api/inventory/*
 * @desc    Inventory module operations (Receive goods, Stock management, etc.)
 * @access  Private (Inventory role only)
 */
router.use("/inventory/factory-to-store", inventoryFactoryToStoreRoutes);
router.use("/inventory/local-stock", inventoryLocalStockRoutes);
router.use("/inventory/requisitions", inventoryRequisitionsRoutes);
router.use("/inventory/depot-transfers", depotTransfersRoutes);

/**
 * Finance Routes
 * @route   /api/finance/*
 * @desc    Finance module operations (Customer Ledger, etc.)
 * @access  Private (authenticated users with proper permissions)
 */
router.use("/finance/customerledger", customerLedgerRoutes);

/**
 * Demand Orders Routes
 * @route   /api/ordermanagement/demandorders
 * @desc    Demand order management for distributors
 * @access  Private (Distributor role only)
 */
router.use("/ordermanagement/demandorders", demandOrdersRoutes);

/**
 * Collections Routes
 * @route   /api/ordermanagement/collections
 * @desc    Payment collections from distributors
 * @access  Private (Distributor role only)
 */
router.use("/ordermanagement/collections", collectionsRoutes);

/**
 * Schedulings Routes
 * @route   /api/ordermanagement/schedulings
 * @desc    Distribution scheduling and Finance approval for approved demand orders
 * @access  Private (Distribution and Finance roles)
 */
router.use("/ordermanagement/schedulings", schedulingsRoutes);

/**
 * Offer Products Routes (Sales Admin & Inventory)
 * @route   /api/offers/send-items
 * @desc    Send PROCURED (offer) products from Sales Admin to depots
 * @access  Private (Sales Admin role)
 */
router.use("/offers/send-items", offerSendItemsRoutes);

/**
 * Offer Products Receive Routes (Inventory)
 * @route   /api/offers/receive-items
 * @desc    Receive PROCURED (offer) products at depot level
 * @access  Private (Inventory role)
 */
router.use("/offers/receive-items", offerReceiveItemsRoutes);

/**
 * Distribution Routes (Load Sheets, Chalans, Invoices)
 * @route   /api/distribution/*
 * @desc    Distribution module operations (Load Sheets, Delivery Chalans, Invoices)
 * @access  Private (Inventory Depot role)
 */
router.use("/distribution", distributionRoutes);

/**
 * Distributor Routes (Receive Chalans, View Stock)
 * @route   /api/distributor/*
 * @desc    Distributor operations (Receive goods from depot, manage stock)
 * @access  Private (Distributor role)
 */
router.use("/distributor", distributorPortalRoutes);

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
          facilities: "/api/facilities",
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
