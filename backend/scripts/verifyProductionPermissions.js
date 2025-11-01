/**
 * Verify Production role has all required permissions
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function verifyPermissions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Find Production role
    const role = await db.collection("roles").findOne({ role: "Production" });
    if (!role) {
      console.log("❌ Production role not found");
      process.exit(1);
    }

    console.log("📋 Production Role ID:", role._id.toString());
    console.log("📋 Role Name:", role.role);
    console.log("📋 Active:", role.active);

    // Get all permissions for Production role
    const permissions = await db
      .collection("role_api_permissions")
      .aggregate([
        { $match: { role_id: role._id } },
        {
          $lookup: {
            from: "api_permissions",
            localField: "api_permission_id",
            foreignField: "_id",
            as: "permission",
          },
        },
        { $unwind: "$permission" },
      ])
      .toArray();

    console.log("\n📋 Production Role API Permissions:");
    if (permissions.length === 0) {
      console.log("   ❌ No permissions found!");
    } else {
      permissions.forEach((p) => {
        console.log(`   ✅ ${p.permission.api_permissions}`);
      });
    }

    // Check for required permissions
    const requiredPermissions = ["products:read", "production:send-to-store:create"];

    console.log("\n🔍 Checking Required Permissions:");
    const permissionNames = permissions.map((p) => p.permission.api_permissions);

    requiredPermissions.forEach((reqPerm) => {
      if (permissionNames.includes(reqPerm)) {
        console.log(`   ✅ ${reqPerm} - Found`);
      } else {
        console.log(`   ❌ ${reqPerm} - MISSING`);
      }
    });

    console.log("\n✅ Verification complete!");
    console.log(
      "\n⚠️  IMPORTANT: User must log out and log back in to get updated permissions in JWT token"
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

verifyPermissions();
