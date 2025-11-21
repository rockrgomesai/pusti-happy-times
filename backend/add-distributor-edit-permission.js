/**
 * Add collection:edit permission to Distributor role
 */

const mongoose = require("mongoose");
const { Role } = require("./src/models");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addDistributorEditPermission() {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find collection:edit permission
    const permission = await ApiPermission.findOne({ api_permissions: "collection:edit" });

    if (!permission) {
      console.log("❌ Permission 'collection:edit' not found!");
      console.log("   Run backend/create-approval-permissions.js first");
      process.exit(1);
    }

    console.log(`✅ Found permission: collection:edit (${permission._id})`);

    // Find Distributor role
    const distributorRole = await Role.findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.log("❌ Role 'Distributor' not found!");
      process.exit(1);
    }

    console.log(`✅ Found role: Distributor (${distributorRole._id})`);

    // Check if already assigned
    const existing = await RoleApiPermission.findOne({
      role_id: distributorRole._id,
      api_permission_id: permission._id,
    });

    if (existing) {
      console.log("\n✅ Permission 'collection:edit' is already assigned to Distributor role!");
    } else {
      await RoleApiPermission.create({
        role_id: distributorRole._id,
        api_permission_id: permission._id,
      });
      console.log("\n✅ Successfully assigned 'collection:edit' permission to Distributor role!");
    }

    console.log("\n⚠️  Distributors must logout and login to refresh their JWT tokens.\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addDistributorEditPermission();
