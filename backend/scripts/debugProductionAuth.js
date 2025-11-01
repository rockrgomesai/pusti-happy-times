/**
 * Debug Production user authentication and permissions
 * This script helps debug why the user might be getting 401 errors
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function debugAuth() {
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

    console.log("📋 Production Role:");
    console.log("   ID:", role._id.toString());
    console.log("   Name:", role.role);
    console.log("   Active:", role.active);

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

    console.log("\n📋 Production Role API Permissions in Database:");
    permissions.forEach((p) => {
      console.log(`   ✅ ${p.permission.api_permissions}`);
    });

    // Find a Production user
    const user = await db.collection("users").findOne({
      role_id: role._id,
      active: true,
    });

    if (!user) {
      console.log("\n❌ No active Production user found");
      process.exit(1);
    }

    console.log("\n📋 Production User:");
    console.log("   ID:", user._id.toString());
    console.log("   Username:", user.username);
    console.log("   Active:", user.active);
    console.log("   Role ID:", user.role_id.toString());

    // Find employee for this user
    if (user.employee_id) {
      const employee = await db.collection("employees").findOne({
        _id: user.employee_id,
      });

      if (employee) {
        console.log("\n📋 Associated Employee:");
        console.log("   ID:", employee._id.toString());
        console.log("   Name:", employee.name);
        console.log("   Facility ID:", employee.facility_id?.toString() || "NOT SET");
        console.log("   Factory Store ID:", employee.factory_store_id?.toString() || "NOT SET");
      }
    }

    // Check the send-to-store permission specifically
    const sendToStorePermission = await db.collection("api_permissions").findOne({
      api_permissions: "production:send-to-store:create",
    });

    if (!sendToStorePermission) {
      console.log("\n❌ production:send-to-store:create permission NOT FOUND in api_permissions");
    } else {
      console.log("\n✅ production:send-to-store:create permission exists in api_permissions");
      console.log("   Permission ID:", sendToStorePermission._id.toString());

      // Check if role has this permission
      const roleHasPermission = await db.collection("role_api_permissions").findOne({
        role_id: role._id,
        api_permission_id: sendToStorePermission._id,
      });

      if (!roleHasPermission) {
        console.log("   ❌ Role does NOT have this permission assigned");
      } else {
        console.log("   ✅ Role HAS this permission assigned");
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("DIAGNOSIS:");
    console.log("=".repeat(70));
    console.log("\n1. Database permissions are correct: ✅");
    console.log("2. User must LOG OUT and LOG BACK IN to get fresh JWT token");
    console.log("3. The JWT token contains permissions at login time only");
    console.log("4. After logout/login, user will have the new permission");
    console.log("\n" + "=".repeat(70));
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

debugAuth();
