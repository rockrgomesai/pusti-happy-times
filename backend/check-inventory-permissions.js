/**
 * Check what permissions Inventory Depot role has
 */

const mongoose = require("mongoose");
const Role = require("./src/models/Role");
const { RoleApiPermission } = require("./src/models/JunctionTables");
const { ApiPermission } = require("./src/models/Permission");

const MONGODB_URI =
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkPermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Inventory Depot role
    const role = await Role.findOne({ role: "Inventory Depot" });
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }
    console.log("✅ Found Inventory Depot role:", role._id);

    // Get all permissions for this role
    const rolePermissions = await RoleApiPermission.find({
      role_id: role._id,
    }).populate("api_permission_id");

    console.log("\n📋 Inventory Depot Role Permissions:");
    console.log("=====================================");

    if (rolePermissions.length === 0) {
      console.log("❌ No permissions assigned to this role");
    } else {
      rolePermissions.forEach((rp, index) => {
        console.log(`${index + 1}. ${rp.api_permission_id.api_permissions}`);
      });
    }

    // Check for specific offer permissions
    console.log("\n🔍 Checking for offer-related permissions:");
    const hasReceiveRead = rolePermissions.some(
      (rp) => rp.api_permission_id.api_permissions === "offers:receive:read"
    );
    const hasReceiveCreate = rolePermissions.some(
      (rp) => rp.api_permission_id.api_permissions === "offers:receive:create"
    );
    const hasInventoryView = rolePermissions.some(
      (rp) => rp.api_permission_id.api_permissions === "inventory:view:read"
    );

    console.log(`- offers:receive:read: ${hasReceiveRead ? "✅" : "❌"}`);
    console.log(`- offers:receive:create: ${hasReceiveCreate ? "✅" : "❌"}`);
    console.log(`- inventory:view:read: ${hasInventoryView ? "✅" : "❌"}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkPermissions();
