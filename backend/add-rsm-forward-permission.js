const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const Role = require("./src/models/Role");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

async function addRSMForwardPermission() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find RSM role
    const rsmRole = await Role.findOne({ role: "RSM" });
    if (!rsmRole) {
      console.log("❌ RSM role not found");
      process.exit(1);
    }
    console.log(`✅ Found RSM role: ${rsmRole.role}`);

    // Find demandorder:update permission
    const updatePermission = await ApiPermission.findOne({
      api_permissions: "demandorder:update",
    });

    if (!updatePermission) {
      console.log("❌ demandorder:update permission not found");
      process.exit(1);
    }
    console.log(`✅ Found permission: ${updatePermission.api_permissions}`);

    // Check if permission already exists
    const existing = await RoleApiPermission.findOne({
      role_id: rsmRole._id,
      api_permission_id: updatePermission._id,
    });

    if (existing) {
      console.log("ℹ️  RSM already has demandorder:update permission");
    } else {
      // Add permission
      await RoleApiPermission.create({
        role_id: rsmRole._id,
        api_permission_id: updatePermission._id,
      });
      console.log("✅ Added demandorder:update permission to RSM role");
    }

    console.log("\n✅ All done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addRSMForwardPermission();
