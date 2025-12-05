/**
 * Add scheduling API permissions to Distribution and other roles
 *
 * Usage: node add-scheduling-permissions.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Models
const models = require("./src/models");
const Role = models.Role;
const ApiPermission = models.ApiPermission;
const RoleApiPermission = models.RoleApiPermission;

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ MongoDB connected");
  } catch (error) {
    console.error("✗ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Permissions to create/assign
const schedulingPermissions = [
  { api_permissions: "my-schedulings:read" },
  { api_permissions: "schedulings:depots" },
  { api_permissions: "scheduling:update" },
];

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Adding Scheduling Permissions ===\n");

    // Create/find permissions
    const createdPermissions = [];
    for (const permDef of schedulingPermissions) {
      let permission = await ApiPermission.findOne({
        api_permissions: permDef.api_permissions,
      });

      if (!permission) {
        permission = await ApiPermission.create({
          api_permissions: permDef.api_permissions,
        });
        console.log(`✓ Created permission: ${permDef.api_permissions}`);
      } else {
        console.log(`  Permission exists: ${permDef.api_permissions}`);
      }

      createdPermissions.push(permission);
    }

    // Roles to assign
    const roleNames = [
      "Distribution",
      "Sales Admin",
      "Order Management",
      "Finance",
      "Inventory Depot",
    ];

    console.log("\n=== Assigning to Roles ===\n");

    for (const roleName of roleNames) {
      const role = await Role.findOne({ role: roleName });
      if (!role) {
        console.log(`⚠ ${roleName} role not found, skipping`);
        continue;
      }

      console.log(`Assigning to ${roleName}:`);

      for (const permission of createdPermissions) {
        const existing = await RoleApiPermission.findOne({
          role_id: role._id,
          api_permission_id: permission._id,
        });

        if (!existing) {
          await RoleApiPermission.create({
            role_id: role._id,
            api_permission_id: permission._id,
          });
          console.log(`  ✓ ${permission.api_permissions}`);
        } else {
          console.log(`    Already has ${permission.api_permissions}`);
        }
      }
      console.log("");
    }

    // Summary
    console.log("=== Summary ===\n");

    for (const roleName of roleNames) {
      const role = await Role.findOne({ role: roleName });
      if (role) {
        const totalPerms = await RoleApiPermission.countDocuments({
          role_id: role._id,
        });
        console.log(`${roleName}: ${totalPerms} total API permissions`);
      }
    }

    console.log("\n✓ Scheduling permissions setup complete!\n");

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
