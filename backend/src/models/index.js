/**
 * Models Index
 * Pusti Happy Times - Central Model Export
 *
 * This file serves as the central point for importing all Mongoose models
 * in the application. It provides a clean interface for accessing models
 * throughout the backend application.
 *
 * Features:
 * - Centralized model exports
 * - Model relationship setup
 * - Connection validation
 */

const mongoose = require("mongoose");

// Import all model modules
const Role = require("./Role");
const User = require("./User");
const Brand = require("./Brand");
const Factory = require("./Factory");
const Depot = require("./Depot");
const Employee = require("./Employee");
const Designation = require("./Designation");
const Transport = require("./Transport");
const SidebarMenuItem = require("./SidebarMenuItem");
const Category = require("./Category");
const { ApiPermission, PagePermission } = require("./Permission");
const Product = require("./Product");
const Territory = require("./Territory");
const Distributor = require("./Distributor");

// Import junction table models
const {
  RoleSidebarMenuItem,
  RoleApiPermission,
  RolePagePermission,
} = require("./JunctionTables");

/**
 * Model Registry
 * Central registry of all application models
 */
const models = {
  // Core models
  Role,
  User,
  Brand,
  Factory,
  Depot,
  Employee,
  Designation,
  Transport,
  Category,
  Product,
  Territory,
  Distributor,
  SidebarMenuItem,

  // Permission models
  ApiPermission,
  PagePermission,

  // Junction table models
  RoleSidebarMenuItem,
  RoleApiPermission,
  RolePagePermission,
};

/**
 * Model Validation
 * Validates that all required models are properly loaded
 */
const validateModels = () => {
  const requiredModels = [
    "Role",
    "User",
    "Brand",
    "Factory",
    "Depot",
    "Employee",
    "Designation",
    "Category",
  "Product",
  "Territory",
  "Distributor",
    "SidebarMenuItem",
    "ApiPermission",
    "PagePermission",
    "RoleSidebarMenuItem",
    "RoleApiPermission",
    "RolePagePermission",
  ];

  for (const modelName of requiredModels) {
    if (!models[modelName]) {
      throw new Error(`Model ${modelName} is not properly loaded`);
    }
  }

  console.log("✅ All models validated successfully");
  return true;
};

/**
 * Get Database Connection Status
 * @returns {String} Connection state description
 */
const getConnectionStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
};

/**
 * Model Utilities
 */
const modelUtils = {
  /**
   * Check if database is connected
   * @returns {Boolean} True if connected, false otherwise
   */
  isConnected: () => mongoose.connection.readyState === 1,

  /**
   * Get connection status
   * @returns {String} Connection status
   */
  getStatus: getConnectionStatus,

  /**
   * Validate all models
   * @returns {Boolean} True if all models are valid
   */
  validate: validateModels,

  /**
   * Get all model names
   * @returns {Array} Array of model names
   */
  getModelNames: () => Object.keys(models),

  /**
   * Get model by name
   * @param {String} modelName - Name of the model
   * @returns {Object|null} Model or null if not found
   */
  getModel: (modelName) => models[modelName] || null,
};

/**
 * Initialize Models
 * Sets up any required model configurations or relationships
 */
const initializeModels = () => {
  try {
    // Validate all models are loaded
    validateModels();

    // Log successful initialization
    console.log("📦 Models initialized successfully");
    console.log(`📊 Database status: ${getConnectionStatus()}`);

    return true;
  } catch (error) {
    console.error("❌ Model initialization failed:", error.message);
    throw error;
  }
};

// Export individual models for direct access
module.exports = {
  // Core models
  Role,
  User,
  Brand,
  Factory,
  Depot,
  Employee,
  Designation,
  Transport,
  Category,
  Product,
  Territory,
  Distributor,
  SidebarMenuItem,

  // Permission models
  ApiPermission,
  PagePermission,

  // Junction table models
  RoleSidebarMenuItem,
  RoleApiPermission,
  RolePagePermission,

  // Utilities
  models,
  modelUtils,
  initializeModels,

  // Aliases for common access patterns
  getAllModels: () => models,
  getModelNames: () => Object.keys(models),
};
