const mongoose = require("mongoose");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkDistributionPermissions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find Distribution role
    const role = await db.collection("roles").findOne({ role: "Distribution" });

    if (!role) {
      console.log("❌ Distribution role not found");
      await mongoose.connection.close();
      return;
    }

    console.log("\n📋 Distribution Role:");
    console.log(`   ID: ${role._id}`);
    console.log(`   Name: ${role.role}`);

    // Find permissions for Distribution role
    const rolePermissions = await db
      .collection("role_api_permissions")
      .find({ role_id: role._id })
      .toArray();

    console.log(`\n🔐 Role API Permissions (${rolePermissions.length}):`);

    // Get permission details
    for (const rp of rolePermissions) {
      const permission = await db
        .collection("api_permissions")
        .findOne({ _id: rp.api_permission_id });
      if (permission) {
        console.log(`   ✓ ${permission.api_permissions}`);
      }
    }

    // Check for scheduling permissions
    console.log("\n🔍 Scheduling-related permissions:");
    const allPermissions = await db
      .collection("api_permissions")
      .find({ api_permissions: /scheduling/ })
      .toArray();

    for (const perm of allPermissions) {
      const hasIt = rolePermissions.some(
        (rp) => rp.api_permission_id.toString() === perm._id.toString()
      );
      console.log(`   ${hasIt ? "✓" : "✗"} ${perm.api_permissions}`);
    }

    await mongoose.connection.close();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDistributionPermissions();
