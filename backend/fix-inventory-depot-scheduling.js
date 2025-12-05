/**
 * Fix Inventory Depot scheduling permissions
 * Add scheduling:read which is the actual permission required by the endpoints
 *
 * Usage: node fix-inventory-depot-scheduling.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const models = require("./src/models");
const Role = models.Role;
const ApiPermission = models.ApiPermission;
const RoleApiPermission = models.RoleApiPermission;

async function fixPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Get Inventory Depot role by ID
    const role = await models.Role.findById("690750354bdacd1e192d1ab3").lean();

    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    console.log("=== FIXING INVENTORY DEPOT SCHEDULING PERMISSIONS ===");
    console.log("Role:", role.role_name);
    console.log("ID:", role._id, "\n");

    // The permission that's actually needed
    const requiredPermission = "scheduling:read";

    // Check if already has it
    let permission = await ApiPermission.findOne({ api_permissions: requiredPermission });

    if (!permission) {
      console.log(`Creating permission: ${requiredPermission}`);
      permission = await ApiPermission.create({
        api_permissions: requiredPermission,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      console.log(`✓ Permission exists: ${requiredPermission}`);
    }

    // Check if already linked
    const existing = await RoleApiPermission.findOne({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    if (existing) {
      console.log(`✓ Permission already assigned to role`);
    } else {
      await RoleApiPermission.create({
        role_id: role._id,
        api_permission_id: permission._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✓ Added ${requiredPermission} to Inventory Depot`);
    }

    // Verify final permissions
    const allPerms = await RoleApiPermission.find({ role_id: role._id })
      .populate("api_permission_id", "api_permissions")
      .lean();

    const schedulingPerms = allPerms
      .map((p) => p.api_permission_id?.api_permissions)
      .filter((p) => p && p.toLowerCase().includes("schedul"))
      .sort();

    console.log(`\n=== SCHEDULING PERMISSIONS (${schedulingPerms.length}) ===`);
    schedulingPerms.forEach((p) => console.log(`  ✓ ${p}`));

    console.log(`\n✅ Inventory Depot now has ${allPerms.length} total API permissions`);

    await mongoose.connection.close();
    console.log("\n✓ Done");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

fixPermissions();
