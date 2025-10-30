/**
 * Replace erp_id sparse index with partial index
 * Partial indexes only apply to documents that match the filter
 * This allows multiple nulls while enforcing uniqueness for non-null values
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function createPartialErpIdIndex() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("products");

    // Drop existing erp_id_1 index if it exists
    const indexes = await collection.indexes();
    const erpIdIndex = indexes.find((idx) => idx.name === "erp_id_1");

    if (erpIdIndex) {
      console.log("\n🔧 Dropping old erp_id_1 index...");
      await collection.dropIndex("erp_id_1");
      console.log("✅ Old index dropped");
    }

    // Create partial unique index (only applies where erp_id is not null)
    console.log("\n🔧 Creating partial unique index on erp_id...");
    await collection.createIndex(
      { erp_id: 1 },
      {
        unique: true,
        partialFilterExpression: { erp_id: { $type: "number" } }, // Only index non-null numeric values
        name: "erp_id_1",
      }
    );
    console.log("✅ New partial unique index created");

    // Verify the new index
    const newIndexes = await collection.indexes();
    const newErpIdIndex = newIndexes.find((idx) => idx.name === "erp_id_1");
    console.log("\n✅ Verified new index:");
    console.log(JSON.stringify(newErpIdIndex, null, 2));

    // Test counts
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

createPartialErpIdIndex();
