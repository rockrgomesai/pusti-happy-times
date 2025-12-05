const mongoose = require("mongoose");
const models = require("./src/models");

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

const permissions = [
  { api_permissions: "load-sheet:lock" },
  { api_permissions: "chalan:create" },
  { api_permissions: "chalan:read" },
  { api_permissions: "chalan:edit" },
  { api_permissions: "chalan:print" },
  { api_permissions: "invoice:create" },
  { api_permissions: "invoice:read" },
  { api_permissions: "invoice:edit" },
  { api_permissions: "invoice:print" },
];

async function createPermissions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Create or update permissions
    for (const permission of permissions) {
      const existing = await models.ApiPermission.findOne({
        api_permissions: permission.api_permissions,
      });
      if (existing) {
        console.log(`⏭️  Permission already exists: ${permission.api_permissions}`);
      } else {
        await models.ApiPermission.create(permission);
        console.log(`✅ Created permission: ${permission.api_permissions}`);
      }
    }

    // Find Inventory Depot role by ID (role field has quotes which makes searching difficult)
    const inventoryDepotRole = await models.Role.findById("690750354bdacd1e192d1ab3");
    if (!inventoryDepotRole) {
      console.log("⚠️  Warning: 'Inventory Depot' role not found");
      console.log("   Please create the role or assign permissions manually");
    } else {
      // Get all permission IDs
      const permissionDocs = await models.ApiPermission.find({
        api_permissions: { $in: permissions.map((p) => p.api_permissions) },
      });
      const permissionIds = permissionDocs.map((p) => p._id);

      // Initialize api_permissions array if undefined
      if (!inventoryDepotRole.api_permissions) {
        inventoryDepotRole.api_permissions = [];
      }

      // Add to role if not already present
      let updated = false;
      for (const permId of permissionIds) {
        if (!inventoryDepotRole.api_permissions.some((p) => p.toString() === permId.toString())) {
          inventoryDepotRole.api_permissions.push(permId);
          updated = true;
        }
      }

      if (updated) {
        await inventoryDepotRole.save();
        console.log(`✅ Assigned ${permissionIds.length} permissions to 'Inventory Depot' role`);
      } else {
        console.log(`⏭️  'Inventory Depot' role already has all permissions`);
      }
    }

    console.log("\n✅ Permission creation complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createPermissions();
