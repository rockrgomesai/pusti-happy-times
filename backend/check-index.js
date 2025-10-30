/**
 * Check the current state of bangla_name index
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("products");

    // Get all indexes
    const indexes = await collection.indexes();
    console.log("\n📋 All indexes:");
    indexes.forEach((idx) => {
      console.log(`\n  Name: ${idx.name}`);
      console.log(`  Key: ${JSON.stringify(idx.key)}`);
      console.log(`  Unique: ${idx.unique || false}`);
      console.log(`  Sparse: ${idx.sparse || false}`);
    });

    // Specifically check bangla_name index
    const banglaNameIndex = indexes.find((idx) => idx.name === "bangla_name_1");
    if (banglaNameIndex) {
      console.log("\n🔍 bangla_name_1 index details:");
      console.log(JSON.stringify(banglaNameIndex, null, 2));
    } else {
      console.log("\n❌ bangla_name_1 index not found!");
    }

    // Count null values
    const nullCount = await collection.countDocuments({ bangla_name: null });
    console.log(`\n📊 Products with null bangla_name: ${nullCount}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

checkIndex();
