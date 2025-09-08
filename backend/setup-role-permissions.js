/**
 * Role Permissions Setup Script
 * Pusti Happy Times - Initialize Role Management Permissions
 *
 * This script creates the required role permissions and assigns them to SuperAdmin role
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const ApiPermission = require("./src/models/ApiPermission");
const Role = require("./src/models/Role");
const { RoleApiPermission } = require("./src/models/JunctionTables");

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
 * Role permissions to create
 */
const rolePermissions = [
  "create:role",
  "read:role",
  "update:role",
  "delete:role",
];

/**
 * Create role permissions if they don't exist
 */
const createRolePermissions = async () => {
  console.log("Creating role permissions...");

  for (const permission of rolePermissions) {
    try {
      const existingPermission = await ApiPermission.findOne({
        api_permissions: permission,
      });

      if (!existingPermission) {
        const newPermission = new ApiPermission({
          api_permissions: permission,
        });
        await newPermission.save();
        console.log(`✅ Created permission: ${permission}`);
      } else {
        console.log(`ℹ️  Permission already exists: ${permission}`);
      }
    } catch (error) {
      console.error(
        `❌ Error creating permission ${permission}:`,
        error.message
      );
    }
  }
};

/**
 * Assign role permissions to SuperAdmin role
 */
const assignPermissionsToSuperAdmin = async () => {
  console.log("Assigning role permissions to SuperAdmin...");

  try {
    // Find SuperAdmin role
    const superAdminRole = await Role.findOne({ role: "SuperAdmin" });
    if (!superAdminRole) {
      console.error("❌ SuperAdmin role not found!");
      return;
    }

    console.log(`📋 Found SuperAdmin role: ${superAdminRole._id}`);

    // Get all role permissions
    const permissions = await ApiPermission.find({
      api_permissions: { $in: rolePermissions },
    });

    console.log(`📋 Found ${permissions.length} role permissions`);

    // Remove existing role permissions for SuperAdmin (to avoid duplicates)
    await RoleApiPermission.deleteMany({
      role_id: superAdminRole._id,
      api_permission_id: { $in: permissions.map((p) => p._id) },
    });

    // Create new role permission assignments
    const rolePermissionAssignments = permissions.map((permission) => ({
      role_id: superAdminRole._id,
      api_permission_id: permission._id,
    }));

    if (rolePermissionAssignments.length > 0) {
      await RoleApiPermission.insertMany(rolePermissionAssignments);
      console.log(
        `✅ Assigned ${rolePermissionAssignments.length} role permissions to SuperAdmin`
      );
    }

    // Display assigned permissions
    console.log("\n📋 Role permissions assigned to SuperAdmin:");
    for (const permission of permissions) {
      console.log(`   - ${permission.api_permissions}`);
    }
  } catch (error) {
    console.error(
      "❌ Error assigning permissions to SuperAdmin:",
      error.message
    );
  }
};

/**
 * Verify permissions assignment
 */
const verifyPermissions = async () => {
  console.log("\nVerifying role permissions assignment...");

  try {
    const superAdminRole = await Role.findOne({ role: "SuperAdmin" });
    if (!superAdminRole) {
      console.error("❌ SuperAdmin role not found!");
      return;
    }

    const assignedPermissions = await RoleApiPermission.find({
      role_id: superAdminRole._id,
    }).populate("api_permission_id", "api_permissions");

    const rolePermissionsAssigned = assignedPermissions.filter((p) =>
      rolePermissions.includes(p.api_permission_id.api_permissions)
    );

    console.log(
      `✅ SuperAdmin has ${rolePermissionsAssigned.length}/${rolePermissions.length} role permissions assigned`
    );

    if (rolePermissionsAssigned.length === rolePermissions.length) {
      console.log(
        "🎉 All role permissions successfully assigned to SuperAdmin!"
      );
    } else {
      console.log("⚠️  Some role permissions may be missing");
    }
  } catch (error) {
    console.error("❌ Error verifying permissions:", error.message);
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    console.log("🚀 Starting Role Permissions Setup...\n");

    await connectDB();
    await createRolePermissions();
    await assignPermissionsToSuperAdmin();
    await verifyPermissions();

    console.log("\n✅ Role permissions setup completed successfully!");
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

module.exports = { main, createRolePermissions, assignPermissionsToSuperAdmin };
