/**
 * Fix bangla_name unique index to be sparse
 * This allows multiple null values while maintaining uniqueness for non-null values
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixBanglaNameIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("products");

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log("\n📋 Existing indexes:");
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}, sparse: ${idx.sparse || false}`);
    });

    // Check if bangla_name_1 index exists
    const banglaNameIndex = indexes.find((idx) => idx.name === "bangla_name_1");

    if (banglaNameIndex) {
      console.log("\n🔧 Dropping old bangla_name_1 index...");
      await collection.dropIndex("bangla_name_1");
      console.log("✅ Old index dropped");
    }

    // Create new sparse unique index
    console.log("\n🔧 Creating new sparse unique index on bangla_name...");
    await collection.createIndex(
      { bangla_name: 1 },
      {
        unique: true,
        sparse: true,
        name: "bangla_name_1",
      }
    );
    console.log("✅ New sparse unique index created");

    // Verify the new index
    const newIndexes = await collection.indexes();
    const newBanglaNameIndex = newIndexes.find((idx) => idx.name === "bangla_name_1");
    console.log("\n✅ Verified new index:");
    console.log(`  - ${newBanglaNameIndex.name}: ${JSON.stringify(newBanglaNameIndex.key)}`);
    console.log(`  - unique: ${newBanglaNameIndex.unique}`);
    console.log(`  - sparse: ${newBanglaNameIndex.sparse}`);

    // Count products with null bangla_name
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

fixBanglaNameIndex();
