/**
 * Assign inventory receive permissions to Inventory Depot role
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function assignPermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // 1. Find Inventory Depot role
    const rolesCollection = db.collection("roles");
    const inventoryDepotRole = await rolesCollection.findOne({ role: "Inventory Depot" });

    if (!inventoryDepotRole) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    console.log("📋 Inventory Depot Role ID:", inventoryDepotRole._id);

    // 2. Find the required permissions
    const apiPermissionsCollection = db.collection("api_permissions");
    const requiredPermissions = ["inventory:pending-receipts:read", "inventory:receive:create"];

    console.log(`\n📋 Looking for ${requiredPermissions.length} permissions...\n`);

    const permissions = await apiPermissionsCollection
      .find({
        api_permissions: { $in: requiredPermissions },
      })
      .toArray();

    console.log(`Found ${permissions.length} permissions:`);
    permissions.forEach((p) => console.log(`   - ${p.api_permissions}`));

    // 3. Assign all permissions to Inventory Depot role
    const roleApiPermissionsCollection = db.collection("roles_api_permissions");
    let assignedCount = 0;
    let skippedCount = 0;

    console.log("\n📝 Assigning permissions...\n");

    for (const permission of permissions) {
      const existing = await roleApiPermissionsCollection.findOne({
        role_id: inventoryDepotRole._id,
        api_permission_id: permission._id,
      });

      if (existing) {
        console.log(`   ⏭️  Skipped: ${permission.api_permissions} (already assigned)`);
        skippedCount++;
      } else {
        await roleApiPermissionsCollection.insertOne({
          role_id: inventoryDepotRole._id,
          api_permission_id: permission._id,
        });
        console.log(`   ✅ Assigned: ${permission.api_permissions}`);
        assignedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Assigned: ${assignedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log(`   - Total: ${permissions.length}`);

    console.log("\n✅ Done! Inventory Depot role now has all required receive permissions");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

assignPermissions();
