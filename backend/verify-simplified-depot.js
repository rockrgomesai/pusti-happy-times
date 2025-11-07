/**
 * Verification Script for Simplified Depot Architecture
 * Run this to verify the new aggregated stock + transaction structure
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function verify() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // 1. Count records in each collection
    console.log("=".repeat(60));
    console.log("📊 COLLECTION COUNTS");
    console.log("=".repeat(60));

    const stockCount = await db.collection("depotstocks").countDocuments({});
    const txInCount = await db.collection("depottransactionins").countDocuments({});
    const txOutCount = await db.collection("depottransactionouts").countDocuments({});

    console.log(`depotstocks:           ${stockCount} records (aggregated)`);
    console.log(`depottransactionins:   ${txInCount} records (batch details)`);
    console.log(`depottransactionouts:  ${txOutCount} records`);

    // 2. Verify aggregation logic
    console.log("\n" + "=".repeat(60));
    console.log("🔍 VERIFYING AGGREGATION LOGIC");
    console.log("=".repeat(60));

    const stocks = await db.collection("depotstocks").find({}).toArray();

    for (const stock of stocks) {
      const productId = stock.product_id.toString();
      const depotId = stock.depot_id.toString();

      // Get all transactions for this depot + product
      const transactions = await db
        .collection("depottransactionins")
        .find({
          depot_id: stock.depot_id,
          product_id: stock.product_id,
        })
        .toArray();

      // Sum up transaction quantities
      const txTotal = transactions.reduce((sum, tx) => {
        const qty = tx.qty_ctn.$numberDecimal
          ? parseFloat(tx.qty_ctn.$numberDecimal)
          : parseFloat(tx.qty_ctn);
        return sum + qty;
      }, 0);

      const stockQty = stock.qty_ctn.$numberDecimal
        ? parseFloat(stock.qty_ctn.$numberDecimal)
        : parseFloat(stock.qty_ctn);

      const match = Math.abs(txTotal - stockQty) < 0.001; // Float comparison tolerance

      console.log(`\nDepot: ${depotId}`);
      console.log(`Product: ${productId}`);
      console.log(`  Stock qty:       ${stockQty} ctn`);
      console.log(`  Transaction sum: ${txTotal} ctn (${transactions.length} batches)`);
      console.log(`  ${match ? "✅ MATCH" : "❌ MISMATCH"}`);

      if (!match) {
        console.log("  ⚠️  Stock quantity does not match transaction total!");
      }
    }

    // 3. Show sample data structure
    console.log("\n" + "=".repeat(60));
    console.log("📋 SAMPLE DATA STRUCTURE");
    console.log("=".repeat(60));

    if (stockCount > 0) {
      const sampleStock = await db.collection("depotstocks").findOne({});
      console.log("\nSample DepotStock (Aggregated):");
      console.log(
        JSON.stringify(
          {
            _id: sampleStock._id,
            depot_id: sampleStock.depot_id,
            product_id: sampleStock.product_id,
            qty_ctn: sampleStock.qty_ctn,
            created_at: sampleStock.created_at,
            updated_at: sampleStock.updated_at,
          },
          null,
          2
        )
      );
      console.log(`Fields: ${Object.keys(sampleStock).length}`);
    }

    if (txInCount > 0) {
      const sampleTx = await db.collection("depottransactionins").findOne({});
      console.log("\nSample DepotTransactionIn (Batch Details):");
      console.log(
        JSON.stringify(
          {
            _id: sampleTx._id,
            depot_id: sampleTx.depot_id,
            product_id: sampleTx.product_id,
            batch_no: sampleTx.batch_no,
            production_date: sampleTx.production_date,
            expiry_date: sampleTx.expiry_date,
            qty_ctn: sampleTx.qty_ctn,
            balance_after_qty_ctn: sampleTx.balance_after_qty_ctn,
            transaction_type: sampleTx.transaction_type,
          },
          null,
          2
        )
      );
      console.log(`Fields: ${Object.keys(sampleTx).length}`);
    }

    // 4. Verify unique constraints
    console.log("\n" + "=".repeat(60));
    console.log("🔐 VERIFYING UNIQUE CONSTRAINTS");
    console.log("=".repeat(60));

    const stockIndexes = await db.collection("depotstocks").indexes();
    const uniqueIndex = stockIndexes.find(
      (idx) => idx.unique && idx.name === "unique_depot_product"
    );

    if (uniqueIndex) {
      console.log("✅ Unique index on {depot_id, product_id} exists");
      console.log(`   Keys: ${JSON.stringify(uniqueIndex.key)}`);
    } else {
      console.log("❌ Unique index on {depot_id, product_id} NOT FOUND");
      console.log("   Available indexes:", stockIndexes.map((i) => i.name).join(", "));
    }

    // 5. Check for duplicate depot+product combinations
    const duplicates = await db
      .collection("depotstocks")
      .aggregate([
        {
          $group: {
            _id: { depot_id: "$depot_id", product_id: "$product_id" },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (duplicates.length > 0) {
      console.log(`\n❌ Found ${duplicates.length} duplicate depot+product combinations:`);
      duplicates.forEach((dup) => {
        console.log(
          `   Depot: ${dup._id.depot_id}, Product: ${dup._id.product_id}, Count: ${dup.count}`
        );
      });
    } else {
      console.log("\n✅ No duplicate depot+product combinations found");
    }

    // 6. Summary
    console.log("\n" + "=".repeat(60));
    console.log("📝 SUMMARY");
    console.log("=".repeat(60));

    console.log(`
Architecture: ✅ Simplified
  - DepotStock: Aggregated quantities only (${stockCount} records)
  - DepotTransactionIn: Full batch details (${txInCount} records)
  - DepotTransactionOut: Outgoing transactions (${txOutCount} records)

Data Integrity: ${duplicates.length === 0 ? "✅" : "❌"} ${duplicates.length === 0 ? "PASS" : "FAIL - Duplicates found"}

Unique Constraint: ${uniqueIndex ? "✅" : "❌"} ${uniqueIndex ? "PASS" : "FAIL"}

Next Steps:
  1. Test API endpoints (receive-from-production, local-stock)
  2. Verify ACID transactions work correctly
  3. Update frontend to handle new response structure
  4. Test batch selection for outgoing transactions
  5. Delete old backup collections after confirming everything works
`);

    console.log("=".repeat(60));
    process.exit(0);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

verify();
