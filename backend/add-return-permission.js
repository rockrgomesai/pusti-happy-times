/**
 * Add collection:return permission
 * For Order Management and Finance to return collections to Sales Admin
 */

const mongoose = require("mongoose");
const { Role } = require("./src/models");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addReturnPermission() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Create or find collection:return permission
    console.log("📝 Creating collection:return permission...");

    let returnPermission = await ApiPermission.findOne({
      api_permissions: "collection:return",
    });

    if (!returnPermission) {
      returnPermission = await ApiPermission.create({
        api_permissions: "collection:return",
      });
      console.log("✅ Created collection:return permission");
    } else {
      console.log("ℹ️  collection:return permission already exists");
    }

    // Assign to Order Management and Finance roles
    const rolesToAssign = ["Order Management", "Finance"];

    console.log("\n📋 Assigning permission to roles...");
    for (const roleName of rolesToAssign) {
      const role = await Role.findOne({ role: roleName });

      if (!role) {
        console.log(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      // Check if already assigned
      const existing = await RoleApiPermission.findOne({
        role_id: role._id,
        api_permission_id: returnPermission._id,
      });

      if (existing) {
        console.log(`ℹ️  ${roleName} already has collection:return`);
      } else {
        await RoleApiPermission.create({
          role_id: role._id,
          api_permission_id: returnPermission._id,
        });
        console.log(`✅ Assigned collection:return to ${roleName}`);
      }
    }

    console.log("\n✨ All done!");
    console.log("\n⚠️  Users need to logout and login again for permissions to take effect.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

addReturnPermission();
