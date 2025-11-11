/**
 * Assign Collection Permissions to Distributor Role
 */

const mongoose = require("mongoose");
const { Role } = require("./src/models");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

const COLLECTION_PERMISSIONS = ["collection:read", "collection:create", "collection:delete"];

async function assignPermissions() {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Distributor role
    const distributorRole = await Role.findOne({ role: "Distributor" });
    if (!distributorRole) {
      console.log("❌ Distributor role not found");
      process.exit(1);
    }
    console.log(`📋 Distributor Role: ${distributorRole.role} (${distributorRole._id})\n`);

    // Create or find each permission and assign to Distributor
    for (const permCode of COLLECTION_PERMISSIONS) {
      console.log(`Processing: ${permCode}`);

      // Create or find permission
      let permission = await ApiPermission.findOne({ api_permissions: permCode });
      if (!permission) {
        permission = await ApiPermission.create({ api_permissions: permCode });
        console.log(`   ✅ Created permission: ${permission._id}`);
      } else {
        console.log(`   ℹ️  Permission exists: ${permission._id}`);
      }

      // Check if already assigned
      const existing = await RoleApiPermission.findOne({
        role_id: distributorRole._id,
        api_permission_id: permission._id,
      });

      if (existing) {
        console.log(`   ℹ️  Already assigned to Distributor`);
      } else {
        await RoleApiPermission.create({
          role_id: distributorRole._id,
          api_permission_id: permission._id,
        });
        console.log(`   ✅ Assigned to Distributor`);
      }
      console.log("");
    }

    console.log("🎉 All collection permissions processed!\n");
    console.log("⚠️  Users must logout and login to refresh their JWT tokens.\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

assignPermissions();
