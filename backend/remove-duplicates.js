const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function removeDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    console.log("🔍 Finding and removing duplicates in role_pg_permissions...\n");

    // Find duplicates
    const duplicates = await db
      .collection("role_pg_permissions")
      .aggregate([
        {
          $group: {
            _id: { role_id: "$role_id", pg_permission_id: "$pg_permission_id" },
            count: { $sum: 1 },
            ids: { $push: "$_id" },
          },
        },
        {
          $match: { count: { $gt: 1 } },
        },
      ])
      .toArray();

    console.log(`Found ${duplicates.length} duplicate combinations\n`);

    let removed = 0;

    // For each duplicate, keep the first one and remove the rest
    for (const dup of duplicates) {
      const idsToRemove = dup.ids.slice(1); // Keep first, remove rest

      for (const id of idsToRemove) {
        await db.collection("role_pg_permissions").deleteOne({ _id: id });
        removed++;
      }

      console.log(
        `✓ Kept 1, removed ${idsToRemove.length} for role_id: ${dup._id.role_id}, pg_permission_id: ${dup._id.pg_permission_id}`
      );
    }

    console.log(`\n✅ Removed ${removed} duplicate documents`);
    console.log("\n🔄 Now re-run: node export-deployment-data.js");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

removeDuplicates();
