require("dotenv").config();
const mongoose = require("mongoose");
const models = require("./src/models");

async function addPermission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find the role
    const role = await models.Role.findOne({ role: "Inventory Depot" });
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }
    console.log(`✅ Found role: ${role.role} (${role._id})`);

    // Find the permission
    const permission = await models.ApiPermission.findOne({
      api_permissions: "facilities:read",
    });
    if (!permission) {
      console.log("❌ facilities:read permission not found");
      process.exit(1);
    }
    console.log(`✅ Found permission: ${permission.api_permissions} (${permission._id})`);

    // Check if already assigned
    const existing = await models.RoleApiPermission.findOne({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    if (existing) {
      console.log("✅ Permission already assigned to role");
    } else {
      await models.RoleApiPermission.create({
        role_id: role._id,
        api_permission_id: permission._id,
      });
      console.log("✅ Added facilities:read permission to Inventory Depot role");
    }

    await mongoose.connection.close();
    console.log("✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

addPermission();
