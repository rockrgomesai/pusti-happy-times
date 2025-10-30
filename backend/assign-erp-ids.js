/**
 * Assign unique erp_id values to all products
 * Strategy: Start from 1000 and increment for each product
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function assignErpIds() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("products");

    // Check current state
    const totalCount = await collection.countDocuments({});
    const nullCount = await collection.countDocuments({ erp_id: null });
    const withErpId = await collection.countDocuments({ erp_id: { $ne: null } });

    console.log("\n📊 Current state:");
    console.log(`  Total products: ${totalCount}`);
    console.log(`  Products with erp_id: ${withErpId}`);
    console.log(`  Products without erp_id: ${nullCount}`);

    // Find the highest existing erp_id
    const maxErpIdDoc = await collection.findOne(
      { erp_id: { $ne: null } },
      { sort: { erp_id: -1 }, projection: { erp_id: 1 } }
    );

    const startErpId = maxErpIdDoc?.erp_id ? Math.max(maxErpIdDoc.erp_id + 1, 1000) : 1000;

    console.log(`\n🔢 Starting erp_id: ${startErpId}`);

    // Get all products without erp_id
    const productsWithoutErpId = await collection
      .find({ erp_id: null })
      .project({ _id: 1 })
      .toArray();

    if (productsWithoutErpId.length === 0) {
      console.log("\n✅ All products already have erp_id");
    } else {
      console.log(`\n🔧 Assigning erp_id to ${productsWithoutErpId.length} products...`);

      let currentErpId = startErpId;
      let updatedCount = 0;

      for (const product of productsWithoutErpId) {
        await collection.updateOne({ _id: product._id }, { $set: { erp_id: currentErpId } });
        currentErpId++;
        updatedCount++;

        if (updatedCount % 50 === 0) {
          console.log(`  ✓ Updated ${updatedCount}/${productsWithoutErpId.length} products...`);
        }
      }

      console.log(`\n✅ Successfully assigned erp_id to ${updatedCount} products`);
      console.log(`  Range: ${startErpId} - ${currentErpId - 1}`);
    }

    // Verify uniqueness
    const duplicates = await collection
      .aggregate([
        { $match: { erp_id: { $ne: null } } },
        { $group: { _id: "$erp_id", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (duplicates.length > 0) {
      console.log("\n❌ Found duplicate erp_id values:");
      duplicates.forEach((dup) => {
        console.log(`  erp_id ${dup._id}: ${dup.count} products`);
      });
    } else {
      console.log("\n✅ All erp_id values are unique");
    }

    // Final count
    const finalCount = await collection.countDocuments({ erp_id: { $ne: null } });
    console.log(`\n📊 Final state: ${finalCount}/${totalCount} products have erp_id`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

assignErpIds();
