/**
 * Copy production:send-to-store permissions from role_api_permissions to roles_api_permissions
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function copyPermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // 1. Find Inventory Factory role
    const role = await db.collection("roles").findOne({ role: "Inventory Factory" });
    console.log(`📋 Inventory Factory role ID: ${role._id}\n`);

    // 2. Find production:send-to-store permissions in api_permissions
    const apiPermissions = await db
      .collection("api_permissions")
      .find({ api_permissions: { $regex: /^production:send-to-store/ } })
      .toArray();

    console.log(`📋 Found ${apiPermissions.length} production:send-to-store permissions\n`);

    // 3. Insert into roles_api_permissions (the CORRECT collection)
    const targetCollection = "roles_api_permissions";
    let insertedCount = 0;
    let skippedCount = 0;

    for (const apiPerm of apiPermissions) {
      // Check if already exists in roles_api_permissions
      const existing = await db.collection(targetCollection).findOne({
        role_id: role._id,
        api_permission_id: apiPerm._id,
      });

      if (existing) {
        console.log(`   ⏭️  Skipped: ${apiPerm.api_permissions} (already exists)`);
        skippedCount++;
      } else {
        await db.collection(targetCollection).insertOne({
          role_id: role._id,
          api_permission_id: apiPerm._id,
        });
        console.log(`   ✅ Inserted: ${apiPerm.api_permissions}`);
        insertedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Inserted: ${insertedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);
    console.log(`   - Total: ${apiPermissions.length}`);

    console.log(
      "\n✅ Done! Production permissions are now in the correct collection (roles_api_permissions)"
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

copyPermissions();
