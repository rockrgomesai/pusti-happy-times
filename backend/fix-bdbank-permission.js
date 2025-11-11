/**
 * Fix BD Banks Permission
 * Create bdbank:read permission and assign to Distributor role
 */

const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const Role = require("./src/models/Role");
const { RoleApiPermission } = require("./src/models/JunctionTables");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixBdBankPermission() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // 1. Create bdbank:read permission
    console.log("📝 Creating bdbank:read permission...");
    let bdbankPerm = await ApiPermission.findOne({ api_permissions: "bdbank:read" });

    if (!bdbankPerm) {
      bdbankPerm = await ApiPermission.create({ api_permissions: "bdbank:read" });
      console.log(`   ✅ Created: bdbank:read (${bdbankPerm._id})`);
    } else {
      console.log(`   ✅ Already exists: bdbank:read (${bdbankPerm._id})`);
    }

    // 2. Assign to Distributor role
    console.log("\n📋 Assigning to Distributor role...");
    const distributorRole = await Role.findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.log("   ❌ Distributor role not found!");
      process.exit(1);
    }

    console.log(`   Found: Distributor (${distributorRole._id})`);

    const existingAssignment = await RoleApiPermission.findOne({
      role_id: distributorRole._id,
      api_permission_id: bdbankPerm._id,
    });

    if (!existingAssignment) {
      await RoleApiPermission.create({
        role_id: distributorRole._id,
        api_permission_id: bdbankPerm._id,
      });
      console.log("   ✅ Assigned bdbank:read to Distributor");
    } else {
      console.log("   ✅ Already assigned");
    }

    console.log("\n✨ Done!");
    console.log("\n⚠️  IMPORTANT: Users must logout and login again to refresh JWT tokens.");

    await mongoose.connection.close();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

fixBdBankPermission();
