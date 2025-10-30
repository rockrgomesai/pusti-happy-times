/**
 * Drop bangla_name unique index completely
 * We'll rely on application-level validation instead
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function dropBanglaNameIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("products");

    // Check if bangla_name_1 index exists
    const indexes = await collection.indexes();
    const banglaNameIndex = indexes.find((idx) => idx.name === "bangla_name_1");

    if (banglaNameIndex) {
      console.log("\n🔧 Dropping bangla_name_1 index...");
      await collection.dropIndex("bangla_name_1");
      console.log("✅ Index dropped successfully");
    } else {
      console.log("\n✅ bangla_name_1 index does not exist");
    }

    // Verify
    const newIndexes = await collection.indexes();
    const stillExists = newIndexes.find((idx) => idx.name === "bangla_name_1");

    if (stillExists) {
      console.log("\n❌ Index still exists!");
    } else {
      console.log("\n✅ Verified: bangla_name_1 index has been removed");
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

dropBanglaNameIndex();
