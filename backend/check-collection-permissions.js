/**
 * Check Collection Permissions Assignment
 */

const mongoose = require("mongoose");
const { Role } = require("./src/models");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkPermissions() {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Distributor role
    const distributorRole = await Role.findOne({ role: "Distributor" });
    if (!distributorRole) {
      console.log("❌ Distributor role not found");
      process.exit(1);
    }
    console.log(`📋 Distributor Role ID: ${distributorRole._id}\n`);

    // Find all collection permissions
    const collectionPerms = await ApiPermission.find({
      api_permissions: { $regex: /collection|bdbank/ },
    }).lean();

    console.log("📋 Collection-related Permissions:");
    collectionPerms.forEach((p) => {
      console.log(`   - ${p.api_permissions} (${p._id})`);
    });
    console.log("");

    // Check which are assigned to Distributor
    const assignedPerms = await RoleApiPermission.find({
      role_id: distributorRole._id,
      api_permission_id: { $in: collectionPerms.map((p) => p._id) },
    }).populate("api_permission_id");

    console.log("✅ Assigned to Distributor:");
    if (assignedPerms.length === 0) {
      console.log("   ❌ NONE! Need to run fix script.");
    } else {
      assignedPerms.forEach((a) => {
        console.log(`   ✓ ${a.api_permission_id.api_permissions}`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkPermissions();
