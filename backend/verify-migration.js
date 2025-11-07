/**
 * Verify Migration Script
 * Checks if data was migrated correctly from old to new collections
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function verifyMigration() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Check collection counts
    console.log("📊 Collection Counts:");
    console.log("=".repeat(60));

    const oldInventoryCount = await db.collection("factorystoreinventories").countDocuments();
    const newStockCount = await db.collection("depotstocks").countDocuments();
    console.log(`Old FactoryStoreInventory: ${oldInventoryCount}`);
    console.log(`New DepotStock: ${newStockCount}`);
    console.log(`✅ Match: ${oldInventoryCount === newStockCount ? "YES" : "NO"}\n`);

    const oldTransactionCount = await db
      .collection("factorystoreinventorytransactions")
      .countDocuments();
    const newTransactionInCount = await db.collection("depottransactionins").countDocuments();
    const newTransactionOutCount = await db.collection("depottransactionouts").countDocuments();
    console.log(`Old FactoryStoreInventoryTransaction: ${oldTransactionCount}`);
    console.log(`New DepotTransactionIn: ${newTransactionInCount}`);
    console.log(`New DepotTransactionOut: ${newTransactionOutCount}`);
    console.log(`New Total: ${newTransactionInCount + newTransactionOutCount}`);
    console.log(
      `✅ Match: ${oldTransactionCount === newTransactionInCount + newTransactionOutCount ? "YES" : "NO"}\n`
    );

    // Sample data comparison
    console.log("📋 Sample Data Comparison:");
    console.log("=".repeat(60));

    const oldSample = await db.collection("factorystoreinventories").findOne();
    const newSample = await db.collection("depotstocks").findOne({
      product_id: oldSample?.product_id,
    });

    if (oldSample && newSample) {
      console.log("Old Record:");
      console.log(`  Facility Store ID: ${oldSample.facility_store_id}`);
      console.log(`  Product ID: ${oldSample.product_id}`);
      console.log(`  Batch No: ${oldSample.batch_no}`);
      console.log(`  Qty (ctn): ${oldSample.qty_ctn}`);

      console.log("\nNew Record:");
      console.log(`  Depot ID: ${newSample.depot_id}`);
      console.log(`  Product ID: ${newSample.product_id}`);
      console.log(`  Batch No: ${newSample.batch_no}`);
      console.log(`  Qty (ctn): ${newSample.qty_ctn}`);

      const match =
        String(oldSample.facility_store_id) === String(newSample.depot_id) &&
        String(oldSample.product_id) === String(newSample.product_id) &&
        oldSample.batch_no === newSample.batch_no;

      console.log(`\n✅ Data Match: ${match ? "YES" : "NO"}`);
    } else {
      console.log("⚠️  No sample data found to compare");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Verification Complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Verification failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyMigration();
