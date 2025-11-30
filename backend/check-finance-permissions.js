const mongoose = require("mongoose");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkFinancePermissions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find Finance role
    const role = await db.collection("roles").findOne({ role: "Finance" });

    if (!role) {
      console.log("❌ Finance role not found");
      await mongoose.connection.close();
      return;
    }

    console.log("\n📋 Finance Role:");
    console.log(`   ID: ${role._id}`);
    console.log(`   Name: ${role.role}`);

    // Find permissions for Finance role
    const rolePermissions = await db
      .collection("role_api_permissions")
      .find({ role_id: role._id })
      .toArray();

    console.log(`\n🔐 Role API Permissions (${rolePermissions.length}):`);

    // Check for scheduling permissions
    console.log("\n🔍 Scheduling-related permissions:");
    const allSchedulingPerms = await db
      .collection("api_permissions")
      .find({ api_permissions: /scheduling/ })
      .toArray();

    for (const perm of allSchedulingPerms) {
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

checkFinancePermissions();
