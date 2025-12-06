const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    console.log("🔍 Checking for duplicate keys in role_pg_permissions...\n");

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

    if (duplicates.length > 0) {
      console.log(`❌ Found ${duplicates.length} duplicate key combinations:\n`);
      duplicates.forEach((dup, index) => {
        console.log(
          `${index + 1}. role_id: ${dup._id.role_id}, pg_permission_id: ${dup._id.pg_permission_id}`
        );
        console.log(`   Count: ${dup.count} duplicates`);
        console.log(`   Document IDs: ${dup.ids.join(", ")}\n`);
      });
    } else {
      console.log("✅ No duplicates found in role_pg_permissions");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkDuplicates();
