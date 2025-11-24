/**
 * Add demandorder:approve permission to Finance role
 */

const mongoose = require("mongoose");
const { Role } = require("./src/models");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addApprovePermission() {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Create demandorder:approve permission
    let permission = await ApiPermission.findOne({ api_permissions: "demandorder:approve" });

    if (!permission) {
      permission = await ApiPermission.create({ api_permissions: "demandorder:approve" });
      console.log(`✅ Created permission: demandorder:approve (${permission._id})`);
    } else {
      console.log(`ℹ️  Permission exists: demandorder:approve (${permission._id})`);
    }

    // Find Finance role
    const financeRole = await Role.findOne({ role: "Finance" });

    if (!financeRole) {
      console.log("❌ Role 'Finance' not found!");
      process.exit(1);
    }

    console.log(`✅ Found role: Finance (${financeRole._id})`);

    // Check if already assigned
    const existing = await RoleApiPermission.findOne({
      role_id: financeRole._id,
      api_permission_id: permission._id,
    });

    if (existing) {
      console.log("\n✅ Permission 'demandorder:approve' is already assigned to Finance role!");
    } else {
      // Assign permission to Finance role
      await RoleApiPermission.create({
        role_id: financeRole._id,
        api_permission_id: permission._id,
      });

      console.log("\n✅ Successfully assigned 'demandorder:approve' permission to Finance role!");
    }

    console.log("\n🎉 Setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addApprovePermission();
