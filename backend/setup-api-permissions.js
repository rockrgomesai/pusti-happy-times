/**
 * Setup API Permissions Script
 * Pusti Happy Times - Add sample API permissions to database
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import the Permission model
const { ApiPermission } = require("./src/models/Permission");

// Sample API permissions data
const apiPermissions = [
  {
    api_permissions: "users:read",
  },
  {
    api_permissions: "users:create",
  },
  {
    api_permissions: "users:update",
  },
  {
    api_permissions: "users:delete",
  },
  {
    api_permissions: "roles:read",
  },
  {
    api_permissions: "roles:create",
  },
  {
    api_permissions: "roles:update",
  },
  {
    api_permissions: "roles:delete",
  },
  {
    api_permissions: "permissions:read",
  },
  {
    api_permissions: "permissions:assign",
  },
  {
    api_permissions: "brands:read",
  },
  {
    api_permissions: "brands:create",
  },
  {
    api_permissions: "brands:update",
  },
  {
    api_permissions: "brands:delete",
  },
  {
    api_permissions: "auth:login",
  },
  {
    api_permissions: "auth:logout",
  },
];

async function setupApiPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ Connected to MongoDB");

    // Clear existing API permissions (optional)
    await ApiPermission.deleteMany({});
    console.log("🧹 Cleared existing API permissions");

    // Insert sample API permissions
    const insertedPermissions = await ApiPermission.insertMany(apiPermissions);
    console.log(`📄 Inserted ${insertedPermissions.length} API permissions:`);

    insertedPermissions.forEach((perm) => {
      console.log(`  - ${perm.api_permissions}`);
    });

    console.log("\n✅ API permissions setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up API permissions:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔐 Database connection closed");
  }
}

// Run the setup
setupApiPermissions();
