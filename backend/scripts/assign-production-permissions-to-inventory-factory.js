/**
 * Assign all production:send-to-store permissions to Inventory Factory role
 * Since Production role has been replaced by Inventory Factory role
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function assignPermissions() {
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

    console.log("📋 Inventory Factory Role ID:", inventoryFactoryRole._id);

    // 2. Find all production:send-to-store permissions
    const apiPermissionsCollection = db.collection("api_permissions");
    const productionPermissions = await apiPermissionsCollection
      .find({
        api_permissions: { $regex: /^production:send-to-store/ },
      })
      .toArray();

    console.log(`\n📋 Found ${productionPermissions.length} production:send-to-store permissions:`);
    productionPermissions.forEach((p) => console.log(`   - ${p.api_permissions}`));

    // 3. Assign all permissions to Inventory Factory role
    const roleApiPermissionsCollection = db.collection("role_api_permissions");
    let assignedCount = 0;
    let skippedCount = 0;

    for (const permission of productionPermissions) {
      const existing = await roleApiPermissionsCollection.findOne({
        role_id: inventoryFactoryRole._id,
        api_permission_id: permission._id,
      });

      if (existing) {
        console.log(`   ⏭️  Skipped: ${permission.api_permissions} (already assigned)`);
        skippedCount++;
      } else {
        await roleApiPermissionsCollection.insertOne({
          role_id: inventoryFactoryRole._id,
          api_permission_id: permission._id,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`   ✅ Assigned: ${permission.api_permissions}`);
        assignedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Assigned: ${assignedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log(`   - Total: ${productionPermissions.length}`);

    console.log(
      "\n✅ Done! Inventory Factory role now has all production:send-to-store permissions"
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

assignPermissions();
