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
const Facility = require("./Facility"); // Unified model for factories and depots
const Employee = require("./Employee");
const Designation = require("./Designation");
const Transport = require("./Transport");
const SidebarMenuItem = require("./SidebarMenuItem_new"); // Use schema that matches database: label, href, m_order, icon, parent_id, is_submenu
const Category = require("./Category");
const { ApiPermission, PagePermission } = require("./Permission");
const Product = require("./Product");
const Territory = require("./Territory");
const Distributor = require("./Distributor");
const DistributorType = require("./DistributorType");
const DSR = require("./DSR");
const Offer = require("./Offer");
const BdBank = require("./BdBank");
const Collection = require("./Collection");
const DemandOrder = require("./DemandOrder");
const Route = require("./Route");
const Outlet = require("./Outlet");
const OutletType = require("./OutletType");
const OutletChannel = require("./OutletChannel");

// Import depot inventory models (new architecture)
const DepotStock = require("./DepotStock");
const DepotTransactionIn = require("./DepotTransactionIn");
const DepotTransactionOut = require("./DepotTransactionOut");

// Import distribution models
const LoadSheet = require("./LoadSheet");
const DeliveryChalan = require("./DeliveryChalan");
const DeliveryInvoice = require("./DeliveryInvoice");
const DistributorStock = require("./DistributorStock");

// Import legacy inventory models (for backward compatibility)
const FactoryStoreInventory = require("./FactoryStoreInventory");
const FactoryStoreInventoryTransaction = require("./FactoryStoreInventoryTransaction");

// Import junction table models
const { RoleSidebarMenuItem, RoleApiPermission, RolePagePermission } = require("./JunctionTables");

// Import requisition workflow models
const InventoryRequisition = require("./InventoryRequisition");
const RequisitionScheduling = require("./RequisitionScheduling");
const RequisitionLoadSheet = require("./RequisitionLoadSheet");
const RequisitionChalan = require("./RequisitionChalan");
const RequisitionInvoice = require("./RequisitionInvoice");

/**
 * Model Registry
 * Central registry of all application models
 */
const models = {
  // Core models
  Role,
  User,
  Brand,
  Facility,
  Employee,
  Designation,
  Transport,
  Category,
  Product,
  Territory,
  Distributor,
  DistributorType,
  DSR,
  Offer,
  BdBank,
  Collection,
  DemandOrder,
  Route,
  Outlet,
  OutletType,
  OutletChannel,
  SidebarMenuItem,

  // Depot inventory models (new architecture)
  DepotStock,
  DepotTransactionIn,
  DepotTransactionOut,

  // Distribution models
  LoadSheet,
  DeliveryChalan,
  DeliveryInvoice,

  // Legacy inventory models (deprecated, use depot models instead)
  FactoryStoreInventory,
  FactoryStoreInventoryTransaction,

  // Requisition workflow models
  InventoryRequisition,
  RequisitionScheduling,
  RequisitionLoadSheet,
  RequisitionChalan,
  RequisitionInvoice,

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
    "Facility",
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
  Facility,
  Employee,
  Designation,
  Transport,
  Category,
  Product,
  Territory,
  DSR,
  Distributor,
  DistributorType,
  Route,
  Outlet,
  OutletType,
  OutletChannel,
  BdBank,
  Collection,
  DemandOrder,
  SidebarMenuItem,

  // Depot inventory models (new architecture)
  DepotStock,
  DepotTransactionIn,
  DepotTransactionOut,

  // Distribution models
  LoadSheet,
  DeliveryChalan,
  DeliveryInvoice,

  // Legacy inventory models (deprecated, use depot models instead)
  FactoryStoreInventory,
  FactoryStoreInventoryTransaction,

  // Requisition workflow models
  InventoryRequisition,
  RequisitionScheduling,
  RequisitionLoadSheet,
  RequisitionChalan,
  RequisitionInvoice,

  // Permission models
  ApiPermission,
  PagePermission,

  // Junction table models
  RoleSidebarMenuItem,
  RoleApiPermission,
  RolePagePermission,
  DistributorStock,

  // Utilities
  models,
  modelUtils,
  initializeModels,

  // Aliases for common access patterns
  getAllModels: () => models,
  getModelNames: () => Object.keys(models),
};
