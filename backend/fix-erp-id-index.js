/**
 * Fix erp_id index to be unique and non-sparse
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixErpIdIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("products");

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log("\n📋 Current indexes:");
    indexes.forEach((idx) => {
      if (idx.name.includes("erp")) {
        console.log(
          `  ${idx.name}: ${JSON.stringify(idx.key)}, unique: ${idx.unique || false}, sparse: ${idx.sparse || false}`
        );
      }
    });

    // Check if erp_id_1 index exists
    const erpIdIndex = indexes.find((idx) => idx.name === "erp_id_1");

    if (erpIdIndex) {
      console.log("\n🔧 Dropping old erp_id_1 index...");
      await collection.dropIndex("erp_id_1");
      console.log("✅ Old index dropped");
    }

    // Create new unique non-sparse index
    console.log("\n🔧 Creating new unique index on erp_id...");
    await collection.createIndex(
      { erp_id: 1 },
      {
        unique: true,
        sparse: false, // NOT sparse - all documents must have erp_id
        name: "erp_id_1",
      }
    );
    console.log("✅ New unique index created");

    // Verify the new index
    const newIndexes = await collection.indexes();
    const newErpIdIndex = newIndexes.find((idx) => idx.name === "erp_id_1");
    console.log("\n✅ Verified new index:");
    console.log(`  Name: ${newErpIdIndex.name}`);
    console.log(`  Key: ${JSON.stringify(newErpIdIndex.key)}`);
    console.log(`  Unique: ${newErpIdIndex.unique}`);
    console.log(`  Sparse: ${newErpIdIndex.sparse || false}`);

    // Check for nulls
    const nullCount = await collection.countDocuments({ erp_id: null });
    console.log(`\n📊 Products with null erp_id: ${nullCount}`);

    if (nullCount > 0) {
      console.log("⚠️  WARNING: There are still products with null erp_id!");
      console.log("   Run assign-erp-ids.js to fix this.");
    }

    // Check for duplicates
    const duplicates = await collection
      .aggregate([
        { $group: { _id: "$erp_id", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (duplicates.length > 0) {
      console.log("\n⚠️  WARNING: Found duplicate erp_id values:");
      duplicates.forEach((dup) => {
        console.log(`  erp_id ${dup._id}: ${dup.count} products`);
      });
    } else {
      console.log("\n✅ All erp_id values are unique");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

fixErpIdIndex();
