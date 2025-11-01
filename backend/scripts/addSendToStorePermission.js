/**
 * Add production:send-to-store:create permission to Production role
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addPermission() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find Production role
    const role = await db.collection("roles").findOne({ role: "Production" });
    if (!role) {
      console.log("❌ Production role not found");
      process.exit(1);
    }

    console.log("✅ Found Production role:", role._id);

    // Find or create production:send-to-store:create permission
    let permission = await db.collection("api_permissions").findOne({
      api_permissions: "production:send-to-store:create",
    });

    if (!permission) {
      const result = await db.collection("api_permissions").insertOne({
        api_permissions: "production:send-to-store:create",
      });
      permission = { _id: result.insertedId };
      console.log("✅ Created production:send-to-store:create permission");
    } else {
      console.log("✅ Found existing production:send-to-store:create permission");
    }

    // Check if already assigned
    const existing = await db.collection("role_api_permissions").findOne({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    if (existing) {
      console.log("✅ Permission already assigned to Production role");
    } else {
      await db.collection("role_api_permissions").insertOne({
        role_id: role._id,
        api_permission_id: permission._id,
      });
      console.log("✅ Assigned production:send-to-store:create permission to Production role");
    }

    // Display all Production role permissions
    const allPermissions = await db
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

    console.log("\n📋 Production role API permissions:");
    allPermissions.forEach((p) => {
      console.log(`   - ${p.permission.api_permissions}`);
    });

    console.log("\n✅ ===== COMPLETE =====");
    console.log("Production role can now create send-to-store shipments");
    console.log("⚠️  User must log out and log back in to get new permissions in JWT token");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

addPermission();
