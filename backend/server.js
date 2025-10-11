/**
 * Main Server Entry Point
 * Pusti Happy Times - MERN Stack Application
 *
 * This file initializes the Express server with comprehensive security,
 * database connections, midd    console.error("/api/v1/stats/public root fallback error", e);
    res.status(500).json({ success: false, message: "Stats error" });
  }
});

// API Routes
app.use("/api/v1", apiRoutes); and route configurations.
 *
 * Features:
 * - Express.js server with security middleware
 * - MongoDB connection with Mongoose ODM
 * - Redis connection for caching and session management
 * - JWT authentication with refresh token support
 * - Role-based access control (RBAC)
 * - Comprehensive error handling
 * - Request logging and monitoring
 * - Rate limiting and security headers
 */

// Load environment variables first
require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
// const rateLimit = require('express-rate-limit');
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const morgan = require("morgan");

// Import custom modules
const { connectDB } = require("./src/config/database");
const { connectRedis } = require("./src/config/redis");
const { errorHandler } = require("./src/middleware/errorHandler");
const notFound = require("./src/middleware/notFound");

// Import routes
const apiRoutes = require("./src/routes");

// Initialize Express app
const app = express();

// Trust proxy for accurate IP addresses behind reverse proxy
app.set("trust proxy", 1);

/**
 * Security Middleware Configuration
 * Implements comprehensive security measures for production deployment
 */

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// RATE LIMITING DISABLED FOR DEVELOPMENT
// const limiter = rateLimit({
//     windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//     max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//     message: {
//       error: 'Too many requests from this IP, please try again later.',
//       statusCode: 429
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
// });
// app.use(limiter);

// CORS configuration for frontend communication
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ];

    console.log(
      "🌐 CORS check - Origin:",
      origin,
      "Allowed:",
      allowedOrigins.includes(origin)
    );

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const publicDir = path.join(__dirname, "public");
const imagesDir = path.join(publicDir, "images");

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

app.use("/images", express.static(imagesDir));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution attacks
app.use(hpp());

// Compression middleware for better performance
app.use(compression());

// HTTP request logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

/**
 * Database Connections
 * Initialize MongoDB and Redis connections
 */

// Connect to MongoDB
connectDB();

// Connect to Redis
connectRedis();

/**
 * API Routes Configuration
 * All routes are prefixed with /api/v1 for versioning
 */

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Pusti Happy Times API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || "1.0.0",
  });
});

/**
 * Public Stats (fallback)
 * This duplicates router-based stats to ensure availability even if router cache not refreshed.
 */
let __rootStatsCache = null;
let __rootStatsAt = 0;
app.get("/api/v1/stats/public", async (req, res) => {
  try {
    const now = Date.now();
    if (__rootStatsCache && now - __rootStatsAt < 15000) {
      return res.json({ success: true, cached: true, data: __rootStatsCache });
    }
    const { User, Brand, Role } = require("./src/models");
    const [users, brands, roles] = await Promise.all([
      User.countDocuments().catch(() => 0),
      Brand.countDocuments().catch(() => 0),
      Role.countDocuments().catch(() => 0),
    ]);
    const data = {
      users,
      brands,
      roles,
      systemHealth: process.uptime() > 0 ? "OK" : "INIT",
      uptimeSeconds: Math.floor(process.uptime()),
      generatedAt: new Date().toISOString(),
      source: "root-fallback",
    };
    __rootStatsCache = data;
    __rootStatsAt = now;
    res.json({ success: true, cached: false, data });
  } catch (e) {
    console.error("/api/stats/public root fallback error", e);
    res.status(500).json({ success: false, message: "Failed to build stats" });
  }
});

// API Routes
app.use("/api/v1", apiRoutes);

/**
 * Error Handling Middleware
 * Must be defined after all routes
 */

// Handle 404 - Route not found
app.use(notFound);

// Global error handler
app.use(errorHandler);

/**
 * Server Initialization
 * Start the Express server and handle graceful shutdown
 */

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                    PUSTI HAPPY TIMES API                     ║
  ║              🚀 Server running successfully! 🚀             ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  Environment: ${process.env.NODE_ENV?.toUpperCase().padEnd(47)} ║
  ║  Port:        ${PORT.toString().padEnd(47)} ║
  ║  Database:    MongoDB + Redis                                ║
  ║  Version:     ${(process.env.APP_VERSION || "1.0.0").padEnd(47)} ║
  ║  Time:        ${new Date().toLocaleString().padEnd(47)} ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});

/**
 * Graceful Shutdown Handling
 * Properly close database connections and server on process termination
 */

const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("✅ HTTP server closed.");

    try {
      // Close MongoDB connection
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed.");

      // Close Redis connection if available
      const redisClient = require("./src/config/redis").getClient();
      if (redisClient) {
        await redisClient.quit();
        console.log("✅ Redis connection closed.");
      }

      console.log("🎉 Graceful shutdown completed successfully.");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during graceful shutdown:", error);
      process.exit(1);
    }
  });
};

// Handle process termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

module.exports = app;
