/**
 * Add DO List API permissions to Sales Admin role
 *
 * Usage: node add-do-permissions.js
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
const doPermissions = [
  {
    api_permissions: "do-list:read",
  },
  {
    api_permissions: "my-do-list:read",
  },
  {
    api_permissions: "do-list:view-history",
  },
  {
    api_permissions: "do-list:search",
  },
];

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Adding DO List Permissions to Sales Admin ===\n");

    // Find Sales Admin role
    const salesAdminRole = await Role.findOne({ role: "Sales Admin" });
    if (!salesAdminRole) {
      console.error("✗ Sales Admin role not found");
      process.exit(1);
    }

    console.log(`✓ Found Sales Admin role: ${salesAdminRole._id}\n`);

    // Also get field roles
    const fieldRoles = await Role.find({
      role: { $in: ["ASM", "RSM", "ZSM", "TSO"] },
    });

    const allRoles = [salesAdminRole, ...fieldRoles];
    console.log(`Assigning permissions to ${allRoles.length} roles:\n`);
    allRoles.forEach((role) => {
      console.log(`  - ${role.role}`);
    });
    console.log("");

    // Create/find permissions
    const createdPermissions = [];
    for (const permDef of doPermissions) {
      let permission = await ApiPermission.findOne({
        api_permissions: permDef.api_permissions,
      });

      if (!permission) {
        // Create permission
        permission = await ApiPermission.create({
          api_permissions: permDef.api_permissions,
        });
        console.log(`✓ Created permission: ${permDef.api_permissions}`);
      } else {
        console.log(`  Permission exists: ${permDef.api_permissions}`);
      }

      createdPermissions.push(permission);
    }

    console.log("\n--- Assigning Permissions to Roles ---\n");

    // Assign permissions to all roles
    for (const role of allRoles) {
      console.log(`Assigning to ${role.role}:`);

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

    for (const role of allRoles) {
      const totalPerms = await RoleApiPermission.countDocuments({
        role_id: role._id,
      });
      console.log(`${role.role}: ${totalPerms} total API permissions`);
    }

    console.log("\n✓ DO List permissions setup complete!\n");

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
