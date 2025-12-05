/**
 * Add Distribution Module Permissions and Menu Items
 * This script adds permissions for Load Sheets, Chalans, and Invoices
 * and assigns them to the Inventory Depot role
 */

require("dotenv").config();
const mongoose = require("mongoose");
const models = require("./src/models");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht";

const permissions = [
  // Load Sheet permissions
  { api_permissions: "load-sheet:create" },
  { api_permissions: "load-sheet:read" },
  { api_permissions: "load-sheet:edit" },
  { api_permissions: "load-sheet:convert" },
  { api_permissions: "load-sheet:delete" },
  // Chalan permissions
  { api_permissions: "chalan:create" },
  { api_permissions: "chalan:read" },
  { api_permissions: "chalan:edit" },
  { api_permissions: "chalan:delete" },
  // Invoice permissions
  { api_permissions: "invoice:create" },
  { api_permissions: "invoice:read" },
  { api_permissions: "invoice:edit" },
];

// Note: Menu items should be created manually through the admin interface
// or using a separate script with proper user IDs for createdBy/updatedBy fields

async function addDistributionPermissions() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Inventory Depot role
    const inventoryDepotRole = await models.Role.findOne({ role: "Inventory Depot" });

    if (!inventoryDepotRole) {
      console.error("❌ Inventory Depot role not found. Please create it first.");
      process.exit(1);
    }

    console.log("✅ Found Inventory Depot role:", inventoryDepotRole.role);

    // Create or update permissions
    console.log("\n📋 Creating/Updating permissions...");
    const createdPermissions = [];

    for (const permData of permissions) {
      let permission = await models.ApiPermission.findOne({
        api_permissions: permData.api_permissions,
      });

      if (!permission) {
        permission = await models.ApiPermission.create(permData);
        console.log(`  ✅ Created permission: ${permission.api_permissions}`);
      } else {
        console.log(`  ℹ️  Permission already exists: ${permission.api_permissions}`);
      }

      createdPermissions.push(permission);

      // Link to Inventory Depot role
      const existingLink = await models.RoleApiPermission.findOne({
        role_id: inventoryDepotRole._id,
        api_permission_id: permission._id,
      });

      if (!existingLink) {
        await models.RoleApiPermission.create({
          role_id: inventoryDepotRole._id,
          api_permission_id: permission._id,
        });
        console.log(`    → Assigned to Inventory Depot role`);
      }
    }

    console.log("\n✅ Distribution module permissions setup complete!");
    console.log(`\n📊 Summary:`);
    console.log(`   - Permissions created/verified: ${permissions.length}`);
    console.log(`   - Role: ${inventoryDepotRole.role}`);
    console.log(`\n📝 Note: Menu items should be created manually through the admin interface`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up Distribution module:", error);
    process.exit(1);
  }
}

addDistributionPermissions();
