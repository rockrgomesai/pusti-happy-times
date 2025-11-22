const mongoose = require("mongoose");
require("dotenv").config();

const Role = require("./src/models/Role");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

async function addHQRolesPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find the demandorder:update permission
    const permission = await ApiPermission.findOne({
      api_permissions: "demandorder:update",
    });

    if (!permission) {
      console.log("❌ Permission 'demandorder:update' not found");
      process.exit(1);
    }

    console.log(`✅ Found permission: ${permission.api_permissions}`);

    // HQ roles that need this permission
    const hqRoles = ["Sales Admin", "Order Management", "Finance", "Distribution"];

    for (const roleName of hqRoles) {
      const role = await Role.findOne({ role: roleName });

      if (!role) {
        console.log(`⚠️  Role '${roleName}' not found, skipping...`);
        continue;
      }

      // Check if permission already exists
      const existing = await RoleApiPermission.findOne({
        role_id: role._id,
        api_permission_id: permission._id,
      });

      if (existing) {
        console.log(`ℹ️  Permission already exists for ${roleName}`);
        continue;
      }

      // Add permission
      await RoleApiPermission.create({
        role_id: role._id,
        api_permission_id: permission._id,
      });

      console.log(`✅ Added demandorder:update permission to ${roleName} role`);
    }

    console.log("\n✅ All HQ roles updated successfully");

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addHQRolesPermissions();
