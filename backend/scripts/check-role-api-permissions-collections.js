/**
 * Check which collection has the role API permissions data
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkCollections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    const collections = ["roleapipermissions", "roles_api_permissions", "role_api_permissions"];

    for (const colName of collections) {
      const count = await db.collection(colName).countDocuments();
      console.log(`📊 ${colName}: ${count} documents`);

      if (count > 0) {
        // Get sample document
        const sample = await db.collection(colName).findOne();
        console.log(`   Sample _id: ${sample._id}`);
      }
    }

    // Check specifically for Inventory Factory permissions
    console.log("\n🔍 Checking Inventory Factory role API permissions...\n");

    const role = await db.collection("roles").findOne({ role: "Inventory Factory" });
    console.log(`Inventory Factory role ID: ${role._id}\n`);

    for (const colName of collections) {
      const count = await db.collection(colName).countDocuments({ role_id: role._id });
      console.log(`📊 ${colName}: ${count} permissions for Inventory Factory`);

      if (count > 0) {
        const perms = await db.collection(colName).find({ role_id: role._id }).toArray();

        for (const p of perms) {
          const apiPerm = await db
            .collection("api_permissions")
            .findOne({ _id: p.api_permission_id });
          if (apiPerm) {
            console.log(`   - ${apiPerm.api_permissions}`);
          }
        }
      }
    }

    console.log("\n✅ Check complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCollections();
