/**
 * Setup Page Permissions Script
 * Pusti Happy Times - Add sample page permissions to database
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import the Permission model
const { PagePermission } = require("./src/models/Permission");

// Sample page permissions data
const pagePermissions = [
  {
    pg_permissions: "pg:dashboard",
  },
  {
    pg_permissions: "pg:users",
  },
  {
    pg_permissions: "pg:roles",
  },
  {
    pg_permissions: "pg:permissions",
  },
  {
    pg_permissions: "pg:brands",
  },
];

async function setupPagePermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ Connected to MongoDB");

    // Clear existing page permissions (optional)
    await PagePermission.deleteMany({});
    console.log("🧹 Cleared existing page permissions");

    // Insert sample page permissions
    const insertedPermissions =
      await PagePermission.insertMany(pagePermissions);
    console.log(`📄 Inserted ${insertedPermissions.length} page permissions:`);

    insertedPermissions.forEach((perm) => {
      console.log(`  - ${perm.pg_permissions}: ${perm.description}`);
    });

    console.log("\n✅ Page permissions setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up page permissions:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔐 Database connection closed");
  }
}

// Run the setup
setupPagePermissions();
