/**
 * PRODUCTION - Diagnose why requisitions don't appear in scheduling
 * Run on VPS: node diagnose-requisition-products.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function diagnoseProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find submitted requisitions with not-scheduled status
    const requisitions = await db.collection("inventory_manufactured_requisitions")
      .find({
        status: "submitted",
        scheduling_status: { $in: ["not-scheduled", "partially-scheduled"] }
      })
      .limit(5)
      .toArray();

    console.log(`=== FOUND ${requisitions.length} REQUISITIONS ===\n`);

    for (const req of requisitions) {
      console.log(`Requisition: ${req.requisition_no}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Scheduling Status: ${req.scheduling_status}`);
      console.log(`  Details count: ${req.details?.length || 0}`);

      if (req.details && req.details.length > 0) {
        for (const detail of req.details) {
          const product = await db.collection("products").findOne({
            _id: detail.product_id
          });

          console.log(`\n  Product: ${product?.sku || detail.product_id}`);
          console.log(`    Qty: ${detail.qty}`);
          console.log(`    Unscheduled Qty: ${detail.unscheduled_qty || "MISSING"}`);
          console.log(`    Product depot_ids: ${product?.depot_ids?.length || 0} depots`);
          console.log(`    Product facility_ids: ${product?.facility_ids?.length || 0} facilities`);

          if (product) {
            if (product.facility_ids && product.facility_ids.length > 0) {
              console.log(`    ✓ Has facility_ids:`, product.facility_ids.map(id => id.toString()));
            } else if (product.depot_ids && product.depot_ids.length > 0) {
              console.log(`    ✓ Has depot_ids:`, product.depot_ids.map(id => id.toString()));
            } else {
              console.log(`    ❌ NO depot_ids or facility_ids - THIS IS THE PROBLEM!`);
              console.log(`       Product will be skipped by scheduling API`);
            }
          } else {
            console.log(`    ❌ Product not found in database!`);
          }
        }
      }
      console.log("\n" + "=".repeat(60) + "\n");
    }

    // Check if ANY products have depot_ids or facility_ids
    const productsWithDepots = await db.collection("products").countDocuments({
      $or: [
        { depot_ids: { $exists: true, $ne: [] } },
        { facility_ids: { $exists: true, $ne: [] } }
      ]
    });

    const totalProducts = await db.collection("products").countDocuments();

    console.log(`\n=== PRODUCT DEPOT ASSIGNMENT ===`);
    console.log(`Total products: ${totalProducts}`);
    console.log(`Products with depot/facility IDs: ${productsWithDepots}`);
    console.log(`Products WITHOUT assignment: ${totalProducts - productsWithDepots}`);

    if (productsWithDepots === 0) {
      console.log(`\n❌ CRITICAL: No products have depot_ids or facility_ids!`);
      console.log(`   The requisition scheduling API requires products to have these fields.`);
      console.log(`   Products need to be assigned to depots/facilities.\n`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

diagnoseProducts();
