/**
 * Check existing api_permissions format
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkPermissions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    const permissions = await db.collection("api_permissions").find({}).limit(5).toArray();

    console.log("\n📋 Sample API Permissions:");
    permissions.forEach((p, idx) => {
      console.log(`\n${idx + 1}.`, JSON.stringify(p, null, 2));
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkPermissions();
