/**
 * Set erp_id to null for PROCURED products
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function clearProcuredErpIds() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const collection = mongoose.connection.db.collection("products");

    // Find PROCURED products with erp_id
    const procuredWithErpId = await collection
      .find({
        product_type: "PROCURED",
        erp_id: { $ne: null },
      })
      .toArray();

    console.log(`\n📊 Found ${procuredWithErpId.length} PROCURED products with erp_id`);

    if (procuredWithErpId.length > 0) {
      console.log("\n🔧 Setting erp_id to null for PROCURED products...");

      const result = await collection.updateMany(
        { product_type: "PROCURED", erp_id: { $ne: null } },
        { $set: { erp_id: null } }
      );

      console.log(`✅ Updated ${result.modifiedCount} products`);
    } else {
      console.log("\n✅ No PROCURED products have erp_id");
    }

    // Verify counts
    const manufactured = await collection.countDocuments({ product_type: "MANUFACTURED" });
    const procured = await collection.countDocuments({ product_type: "PROCURED" });
    const withErpId = await collection.countDocuments({ erp_id: { $ne: null } });
    const nullErpId = await collection.countDocuments({ erp_id: null });

    console.log("\n📊 Final statistics:");
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

clearProcuredErpIds();
