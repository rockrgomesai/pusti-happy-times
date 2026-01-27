/**
 * Add Routes & Outlets API Permissions
 * Run with: node backend/scripts/addRoutesOutletsPermissions.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const { ApiPermission } = require("../src/models/Permission");
const { Role } = require("../src/models");
const { RoleApiPermission } = require("../src/models/JunctionTables");

async function addRoutesOutletsPermissions() {
  try {
    console.log("🔄 Connecting to database...");
    await connectDB();

    // Define the new API permissions
    const newPermissions = [
      // Outlet Types
      "outlet-types:read",
      "outlet-types:create",
      "outlet-types:update",
      "outlet-types:delete",

      // Outlet Channels
      "outlet-channels:read",
      "outlet-channels:create",
      "outlet-channels:update",
      "outlet-channels:delete",

      // Outlet Market Sizes
      "outlet-market-sizes:read",
      "outlet-market-sizes:create",
      "outlet-market-sizes:update",
      "outlet-market-sizes:delete",
    ];

    console.log("\n📝 Creating API Permissions...");
    const createdPermissions = [];

    for (const permission of newPermissions) {
      let existing = await ApiPermission.findOne({ api_permissions: permission });
      
      if (existing) {
        console.log(`   ✓ Permission already exists: ${permission}`);
        createdPermissions.push(existing);
      } else {
        const newPerm = await ApiPermission.create({
          api_permissions: permission,
        });
        createdPermissions.push(newPerm);
        console.log(`   ✓ Created permission: ${permission}`);
      }
    }

    console.log(`\nTotal permissions processed: ${createdPermissions.length}`);

    // Define roles that should have full access to these lookup tables
    const roleNames = ["SuperAdmin", "SalesAdmin", "MIS", "ZSM", "RSM", "ASM"];

    console.log("\n📝 Assigning permissions to roles...");
    let assignmentCount = 0;

    for (const roleName of roleNames) {
      const role = await Role.findOne({ role: roleName });

      if (!role) {
        console.log(`   ⚠ Role not found: ${roleName}`);
        continue;
      }

      console.log(`\n   Processing role: ${roleName} (${role._id})`);

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
          assignmentCount++;
          console.log(`     ✓ Assigned ${permission.api_permissions}`);
        }
      }
    }

    console.log(`\n✅ Successfully assigned ${assignmentCount} permissions`);
    console.log("\n========================================");
    console.log("Routes & Outlets permissions setup complete!");
    console.log("========================================");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addRoutesOutletsPermissions();
