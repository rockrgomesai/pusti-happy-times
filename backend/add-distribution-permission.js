/**
 * Add Distribution Scheduling Permission
 * Creates demandorder:schedule permission and assigns to Distribution role
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Models
const { Role } = require("./src/models");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

async function addDistributionPermission() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGODB_URI_LOCAL ||
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Create demandorder:schedule permission
    let permission = await ApiPermission.findOne({ api_permissions: "demandorder:schedule" });

    if (!permission) {
      permission = await ApiPermission.create({
        api_permissions: "demandorder:schedule",
      });
      console.log(`✅ Created permission: demandorder:schedule (${permission._id})`);
    } else {
      console.log(`ℹ️  Permission exists: demandorder:schedule (${permission._id})`);
    }

    // Find Distribution role
    const distributionRole = await Role.findOne({ role: "Distribution" });
    if (!distributionRole) {
      console.log("❌ Distribution role not found in database");
      process.exit(1);
    }
    console.log(`✅ Found Distribution role: ${distributionRole.role} (${distributionRole._id})`);

    // Check if already assigned
    const existing = await RoleApiPermission.findOne({
      role_id: distributionRole._id,
      api_permission_id: permission._id,
    });

    if (existing) {
      console.log(
        "\n✅ Permission 'demandorder:schedule' is already assigned to Distribution role!"
      );
    } else {
      // Assign permission to Distribution role
      await RoleApiPermission.create({
        role_id: distributionRole._id,
        api_permission_id: permission._id,
      });
      console.log(
        "\n✅ Successfully assigned 'demandorder:schedule' permission to Distribution role!"
      );
    }

    console.log("\n🎉 Setup complete!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up Distribution permission:", error);
    process.exit(1);
  }
}

// Run the script
addDistributionPermission();
