/**
 * List all facilities
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function listFacilities() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    const facilities = await db.collection("facilities").find({}).limit(10).toArray();

    console.log("\n📋 Facilities:");
    facilities.forEach((f, idx) => {
      console.log(`\n${idx + 1}. ${f.name}`);
      console.log(`   ID: ${f._id}`);
      console.log(`   Type: ${f.type || f.facility_type || "NO TYPE FIELD"}`);
      console.log(`   Fields:`, Object.keys(f));
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listFacilities();
