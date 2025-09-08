/**
 * Redis Configuration Module
 * Pusti Happy Times - Redis Connection and Caching
 *
 * This module handles Redis connection for caching, session management,
 * and temporary data storage including failed login attempts tracking.
 *
 * Features:
 * - Redis connection with automatic reconnection
 * - Connection event handling and monitoring
 * - Utility functions for caching operations
 * - Failed login attempts tracking
 * - Session management support
 * - Production-optimized configuration
 */

const redis = require("redis");

let redisClient = null;

/**
 * Redis Connection Configuration
 * Initialize Redis client with production-optimized settings
 */
const connectRedis = async () => {
  try {
    // Determine Redis URL based on environment
    const redisURL =
      process.env.NODE_ENV === "production"
        ? process.env.REDIS_URL
        : process.env.REDIS_URL_LOCAL || process.env.REDIS_URL;

    if (!redisURL) {
      console.warn(
        "⚠️ Redis URL not found in environment variables. Skipping Redis connection."
      );
      return null;
    }

    console.log("🔄 Connecting to Redis...");

    // Create Redis client with configuration
    redisClient = redis.createClient({
      url: redisURL,
      retry_strategy: (options) => {
        // Retry connection with exponential backoff
        if (options.error && options.error.code === "ECONNREFUSED") {
          console.error("❌ Redis server connection refused");
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          // End reconnecting after a specific timeout and flush all commands
          return new Error("Redis retry time exhausted");
        }
        if (options.attempt > 10) {
          // End reconnecting with built in error
          return undefined;
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
      },
      socket: {
        connectTimeout: 10000,
        commandTimeout: 5000,
        lazyConnect: true,
      },
    });

    // Redis event handlers
    redisClient.on("connect", () => {
      console.log("🔄 Redis client connecting...");
    });

    redisClient.on("ready", () => {
      console.log(`
      ╔══════════════════════════════════════════════════════════════╗
      ║                     🔴 REDIS CONNECTED 🔴                    ║
      ╠══════════════════════════════════════════════════════════════╣
      ║  URL:         ${redisURL.replace(/\/\/.*@/, "//***:***@").padEnd(47)} ║
      ║  Status:      Ready for operations                           ║
      ║  Environment: ${process.env.NODE_ENV?.toUpperCase().padEnd(47)} ║
      ║  Use Cases:   Caching, Sessions, Login Attempts             ║
      ╚══════════════════════════════════════════════════════════════╝
      `);
    });

    redisClient.on("error", (error) => {
      console.error("❌ Redis connection error:", error.message);

      // Log additional error details in development
      if (process.env.NODE_ENV === "development") {
        console.error("Full Redis error details:", error);
      }
    });

    redisClient.on("end", () => {
      console.log("⚠️ Redis connection ended");
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 Redis client reconnecting...");
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error("❌ Redis connection failed:", error.message);

    // Log additional error details in development
    if (process.env.NODE_ENV === "development") {
      console.error("Full error details:", error);
    }

    // Don't exit process for Redis failures - app can work without Redis
    console.warn("⚠️ Application will continue without Redis caching");
    return null;
  }
};

/**
 * Get Redis Client Instance
 * @returns {Object|null} Redis client instance or null if not connected
 */
const getClient = () => {
  return redisClient;
};

/**
 * Redis Health Check
 * @returns {Object} Redis connection health status
 */
const checkRedisHealth = async () => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return {
        status: "unhealthy",
        message: "Redis client not connected",
        connected: false,
      };
    }

    // Test Redis with ping
    const pong = await redisClient.ping();

    return {
      status: "healthy",
      message: "Redis connection active",
      connected: true,
      response: pong,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: error.message,
      connected: false,
    };
  }
};

/**
 * Cache Utility Functions
 * Helper functions for common caching operations
 */

/**
 * Set cache with expiration
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} expireInSeconds - Expiration time in seconds
 */
const setCache = async (key, value, expireInSeconds = 3600) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      console.warn("⚠️ Redis not available for caching");
      return false;
    }

    const serializedValue = JSON.stringify(value);
    await redisClient.setEx(key, expireInSeconds, serializedValue);
    return true;
  } catch (error) {
    console.error("❌ Error setting cache:", error.message);
    return false;
  }
};

/**
 * Get cache value
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null
 */
const getCache = async (key) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return null;
    }

    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("❌ Error getting cache:", error.message);
    return null;
  }
};

/**
 * Delete cache key
 * @param {string} key - Cache key to delete
 */
const deleteCache = async (key) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return false;
    }

    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("❌ Error deleting cache:", error.message);
    return false;
  }
};

/**
 * Failed Login Attempts Tracking
 * Functions to track and manage failed login attempts for security
 */

/**
 * Track failed login attempt
 * @param {string} username - Username attempting login
 * @returns {number} Current failed attempt count
 */
const trackFailedLogin = async (username) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return 0;
    }

    const key = `failed_login:${username}`;
    const attempts = await redisClient.incr(key);

    // Set expiration for the key (5 minutes lockout)
    if (attempts === 1) {
      await redisClient.expire(
        key,
        parseInt(process.env.LOCKOUT_TIME) / 1000 || 300
      );
    }

    return attempts;
  } catch (error) {
    console.error("❌ Error tracking failed login:", error.message);
    return 0;
  }
};

/**
 * Get failed login attempts count
 * @param {string} username - Username to check
 * @returns {number} Failed attempts count
 */
const getFailedLoginAttempts = async (username) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return 0;
    }

    const key = `failed_login:${username}`;
    const attempts = await redisClient.get(key);
    return parseInt(attempts) || 0;
  } catch (error) {
    console.error("❌ Error getting failed login attempts:", error.message);
    return 0;
  }
};

/**
 * Clear failed login attempts
 * @param {string} username - Username to clear attempts for
 */
const clearFailedLoginAttempts = async (username) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return false;
    }

    const key = `failed_login:${username}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("❌ Error clearing failed login attempts:", error.message);
    return false;
  }
};

/**
 * Check if user is locked out
 * @param {string} username - Username to check
 * @returns {boolean} True if user is locked out
 */
const isUserLockedOut = async (username) => {
  try {
    const attempts = await getFailedLoginAttempts(username);
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;
    return attempts >= maxAttempts;
  } catch (error) {
    console.error("❌ Error checking lockout status:", error.message);
    return false;
  }
};

/**
 * Token Blacklisting Functions
 * Functions to manage blacklisted tokens for security
 */

/**
 * Check if a token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is blacklisted
 */
const isTokenBlacklisted = async (token) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return false; // If Redis is down, assume token is not blacklisted
    }

    const key = `blacklisted_token:${token}`;
    const result = await redisClient.get(key);
    return result !== null;
  } catch (error) {
    console.error("❌ Error checking token blacklist:", error.message);
    return false;
  }
};

/**
 * Add a token to the blacklist
 * @param {string} token - JWT token to blacklist
 * @param {number} expireInSeconds - Token expiration time in seconds
 * @param {string} reason - Reason for blacklisting
 */
const blacklistToken = async (
  token,
  expireInSeconds = 24 * 60 * 60,
  reason = "logged_out"
) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return false;
    }

    const key = `blacklisted_token:${token}`;
    await redisClient.setEx(key, expireInSeconds, reason);
    return true;
  } catch (error) {
    console.error("❌ Error blacklisting token:", error.message);
    return false;
  }
};

/**
 * Update user activity timestamp
 * @param {string} userId - User ID to update activity for
 */
const updateUserActivity = async (userId) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return false;
    }

    const key = `user_activity:${userId}`;
    const timestamp = new Date().toISOString();
    await redisClient.setEx(key, 24 * 60 * 60, timestamp); // Expire after 24 hours
    return true;
  } catch (error) {
    console.error("❌ Error updating user activity:", error.message);
    return false;
  }
};

/**
 * Remove user's refresh tokens
 * @param {string} userId - User ID to remove refresh tokens for
 */
const removeRefreshToken = async (userId) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return false;
    }

    const keys = await redisClient.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error("❌ Error removing refresh tokens:", error.message);
    return false;
  }
};

/**
 * Get stored refresh token for user
 * @param {string} userId - User ID to get refresh token for
 * @returns {string|null} Stored refresh token or null
 */
const getRefreshToken = async (userId) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return null;
    }

    const keys = await redisClient.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      const token = await redisClient.get(keys[0]);
      return token;
    }
    return null;
  } catch (error) {
    console.error("❌ Error getting refresh token:", error.message);
    return null;
  }
};

/**
 * Clear user activity data
 * @param {string} userId - User ID to clear activity for
 */
const clearUserActivity = async (userId) => {
  try {
    if (!redisClient || !redisClient.isReady) {
      return false;
    }

    const key = `user_activity:${userId}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("❌ Error clearing user activity:", error.message);
    return false;
  }
};

/**
 * Graceful Redis Shutdown
 */
const closeRedisConnection = async () => {
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.quit();
      console.log("✅ Redis connection closed gracefully");
    }
  } catch (error) {
    console.error("❌ Error closing Redis connection:", error);
  }
};

// Handle application termination
process.on("SIGINT", closeRedisConnection);
process.on("SIGTERM", closeRedisConnection);

module.exports = {
  connectRedis,
  getClient,
  checkRedisHealth,
  setCache,
  getCache,
  deleteCache,
  trackFailedLogin,
  getFailedLoginAttempts,
  clearFailedLoginAttempts,
  isUserLockedOut,
  isTokenBlacklisted,
  blacklistToken,
  updateUserActivity,
  removeRefreshToken,
  getRefreshToken,
  clearUserActivity,
  closeRedisConnection,
};
