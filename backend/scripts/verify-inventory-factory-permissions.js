/**
 * Verify Inventory Factory role has all necessary permissions
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function verifyPermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // 1. Find Inventory Factory role
    const rolesCollection = db.collection("roles");
    const inventoryFactoryRole = await rolesCollection.findOne({ role: "Inventory Factory" });

    if (!inventoryFactoryRole) {
      console.log("❌ Inventory Factory role not found");
      process.exit(1);
    }

    console.log("\n📋 Inventory Factory Role:");
    console.log(`   ID: ${inventoryFactoryRole._id}`);
    console.log(`   Name: ${inventoryFactoryRole.role}`);

    // 2. Get all role_api_permissions for this role
    const roleApiPermissionsCollection = db.collection("role_api_permissions");
    const rolePermissions = await roleApiPermissionsCollection
      .find({ role_id: inventoryFactoryRole._id })
      .toArray();

    console.log(
      `\n📋 Found ${rolePermissions.length} API permissions assigned to Inventory Factory:`
    );

    // 3. Get permission details
    const apiPermissionsCollection = db.collection("api_permissions");
    const permissionDetails = [];

    for (const rp of rolePermissions) {
      const perm = await apiPermissionsCollection.findOne({ _id: rp.api_permission_id });
      if (perm) {
        permissionDetails.push(perm.api_permissions);
      }
    }

    // Sort and display
    permissionDetails.sort();
    permissionDetails.forEach((p) => {
      const isSendToStore = p.includes("production:send-to-store");
      console.log(`   ${isSendToStore ? "🎯" : "  "} ${p}`);
    });

    // 4. Check specifically for production:send-to-store permissions
    const sendToStorePerms = permissionDetails.filter((p) =>
      p.startsWith("production:send-to-store")
    );

    console.log(`\n🎯 Production Send-to-Store Permissions (${sendToStorePerms.length}):`);
    const requiredPerms = [
      "production:send-to-store:create",
      "production:send-to-store:read",
      "production:send-to-store:update",
      "production:send-to-store:delete",
    ];

    requiredPerms.forEach((required) => {
      const hasIt = sendToStorePerms.includes(required);
      console.log(`   ${hasIt ? "✅" : "❌"} ${required}`);
    });

    console.log("\n✅ Verification complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyPermissions();
