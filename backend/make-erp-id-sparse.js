/**
 * Update erp_id index to be sparse
 * Allows null values for PROCURED products while maintaining uniqueness for MANUFACTURED
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function makeSparseErpIdIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("products");

    // Get existing indexes
    const indexes = await collection.indexes();
    const erpIdIndex = indexes.find((idx) => idx.name === "erp_id_1");

    console.log("\n📋 Current erp_id index:");
    if (erpIdIndex) {
      console.log(`  unique: ${erpIdIndex.unique}`);
      console.log(`  sparse: ${erpIdIndex.sparse || false}`);
    } else {
      console.log("  Index not found");
    }

    if (erpIdIndex) {
      console.log("\n🔧 Dropping old erp_id_1 index...");
      await collection.dropIndex("erp_id_1");
      console.log("✅ Old index dropped");
    }

    // Create new sparse unique index
    console.log("\n🔧 Creating new sparse unique index on erp_id...");
    await collection.createIndex(
      { erp_id: 1 },
      {
        unique: true,
        sparse: true, // Allows multiple null values
        name: "erp_id_1",
      }
    );
    console.log("✅ New sparse unique index created");

    // Verify the new index
    const newIndexes = await collection.indexes();
    const newErpIdIndex = newIndexes.find((idx) => idx.name === "erp_id_1");
    console.log("\n✅ Verified new index:");
    console.log(`  unique: ${newErpIdIndex.unique}`);
    console.log(`  sparse: ${newErpIdIndex.sparse}`);

    // Count products by type
    const manufactured = await collection.countDocuments({ product_type: "MANUFACTURED" });
    const procured = await collection.countDocuments({ product_type: "PROCURED" });
    const withErpId = await collection.countDocuments({ erp_id: { $ne: null } });
    const nullErpId = await collection.countDocuments({ erp_id: null });

    console.log("\n📊 Product statistics:");
    console.log(`  MANUFACTURED products: ${manufactured}`);
    console.log(`  PROCURED products: ${procured}`);
    console.log(`  Products with erp_id: ${withErpId}`);
    console.log(`  Products with null erp_id: ${nullErpId}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

makeSparseErpIdIndex();
