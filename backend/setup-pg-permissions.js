/**
 * Setup Page Permissions Script
 * Pusti Happy Times - Create pg:permissions and assign to SuperAdmin
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Role = require("./src/models/Role");
const { PagePermission } = require("./src/models/Permission");
const { RolePagePermission } = require("./src/models/JunctionTables");

/**
 * Database connection
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

/**
 * Create pg:permissions permission
 */
const createPgPermissionsPermission = async () => {
  console.log("Creating pg:permissions permission...");

  try {
    // Check if permission already exists
    const existingPermission = await PagePermission.findOne({
      pg_permissions: "pg:permissions",
    });

    if (existingPermission) {
      console.log("⚠️  pg:permissions permission already exists!");
      return existingPermission;
    }

    // Create the permission
    const pgPermissionsPermission = new PagePermission({
      pg_permissions: "pg:permissions",
      description: "Access to Permissions Management page",
      category: "admin",
    });

    await pgPermissionsPermission.save();
    console.log(
      `✅ Created pg:permissions permission: ${pgPermissionsPermission._id}`
    );

    return pgPermissionsPermission;
  } catch (error) {
    console.error(
      "❌ Error creating pg:permissions permission:",
      error.message
    );
    throw error;
  }
};

/**
 * Assign pg:permissions to SuperAdmin role
 */
const assignPgPermissionsToSuperAdmin = async (pgPermissionsPermission) => {
  console.log("Assigning pg:permissions to SuperAdmin role...");

  try {
    // Find SuperAdmin role
    const superAdminRole = await Role.findOne({ role: "SuperAdmin" });

    if (!superAdminRole) {
      console.error("❌ SuperAdmin role not found!");
      return;
    }

    console.log(`✅ Found SuperAdmin role: ${superAdminRole._id}`);

    // Check if assignment already exists
    const existingAssignment = await RolePagePermission.findOne({
      role_id: superAdminRole._id,
      pg_permission_id: pgPermissionsPermission._id,
    });

    if (existingAssignment) {
      console.log("⚠️  pg:permissions already assigned to SuperAdmin!");
      return;
    }

    // Create role-permission assignment
    const rolePermissionAssignment = new RolePagePermission({
      role_id: superAdminRole._id,
      pg_permission_id: pgPermissionsPermission._id,
    });

    await rolePermissionAssignment.save();
    console.log(`✅ Assigned pg:permissions to SuperAdmin role`);
  } catch (error) {
    console.error(
      "❌ Error assigning pg:permissions to SuperAdmin:",
      error.message
    );
    throw error;
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    console.log("🚀 Starting Page Permissions Setup...\n");

    await connectDB();
    const pgPermissionsPermission = await createPgPermissionsPermission();

    if (pgPermissionsPermission) {
      await assignPgPermissionsToSuperAdmin(pgPermissionsPermission);
    }

    console.log("\n✅ Page permissions setup completed successfully!");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
  }
};

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { main, createPgPermissionsPermission };
