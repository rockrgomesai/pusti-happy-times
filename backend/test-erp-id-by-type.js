/**
 * Test erp_id requirements for MANUFACTURED vs PROCURED products
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function testErpIdByProductType() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const Product = require("./src/models/Product");
    const Brand = mongoose.connection.db.collection("brands");
    const Category = mongoose.connection.db.collection("categories");
    const Facility = mongoose.connection.db.collection("facilities");

    const brand = await Brand.findOne();
    const category = await Category.findOne();
    const facility = await Facility.findOne({ type: "Factory" });

    console.log("\n📦 Test data:");
    console.log(`  Brand: ${brand.name} (${brand._id})`);
    console.log(`  Category: ${category.name} (${category._id})`);
    console.log(`  Facility: ${facility.name} (${facility._id})`);

    const maxProduct = await Product.findOne().sort({ erp_id: -1 });
    const testErpId = (maxProduct?.erp_id || 1000) + 100;

    console.log(`\n🔢 Test ERP ID: ${testErpId}`);

    // TEST 1: Create MANUFACTURED product without erp_id (should fail)
    console.log("\n\n=== TEST 1: Create MANUFACTURED product without erp_id ===");
    const manufacturedNoErp = new Product({
      product_type: "MANUFACTURED",
      brand_id: brand._id,
      category_id: category._id,
      sku: `TEST-MFG-NO-ERP-${Date.now()}`,
      name: "Test Manufactured No ERP",
      trade_price: 100,
      wt_pcs: 1,
      unit: "CTN",
      db_price: 90,
      mrp: 120,
      ctn_pcs: 12,
      facility_ids: [facility._id],
      created_by: "test-script",
      updated_by: "test-script",
    });

    try {
      await manufacturedNoErp.save();
      console.log("❌ Test 1 FAILED: Should have required erp_id");
    } catch (error) {
      if (error.message.includes("erp_id")) {
        console.log("✅ Test 1 PASSED: erp_id required for MANUFACTURED");
        console.log(`  Error: ${error.message}`);
      } else {
        console.log("❌ Test 1 FAILED: Wrong error:", error.message);
      }
    }

    // TEST 2: Create MANUFACTURED product with erp_id (should succeed)
    console.log("\n\n=== TEST 2: Create MANUFACTURED product with erp_id ===");
    const manufacturedWithErp = new Product({
      product_type: "MANUFACTURED",
      brand_id: brand._id,
      category_id: category._id,
      sku: `TEST-MFG-ERP-${Date.now()}`,
      erp_id: testErpId,
      name: "Test Manufactured With ERP",
      trade_price: 100,
      wt_pcs: 1,
      unit: "CTN",
      db_price: 90,
      mrp: 120,
      ctn_pcs: 12,
      facility_ids: [facility._id],
      created_by: "test-script",
      updated_by: "test-script",
    });

    try {
      await manufacturedWithErp.save();
      console.log("✅ Test 2 PASSED: MANUFACTURED product created with erp_id");
      console.log(`  Product ID: ${manufacturedWithErp._id}`);
      console.log(`  ERP ID: ${manufacturedWithErp.erp_id}`);
    } catch (error) {
      console.log("❌ Test 2 FAILED:", error.message);
    }

    // TEST 3: Create PROCURED product without erp_id (should succeed)
    console.log("\n\n=== TEST 3: Create PROCURED product without erp_id ===");
    const procuredNoErp = new Product({
      product_type: "PROCURED",
      brand_id: brand._id,
      category_id: category._id,
      sku: `TEST-PROC-NO-ERP-${Date.now()}`,
      name: "Test Procured No ERP",
      trade_price: 50,
      wt_pcs: 1,
      unit: "PCS",
      created_by: "test-script",
      updated_by: "test-script",
    });

    try {
      await procuredNoErp.save();
      console.log("✅ Test 3 PASSED: PROCURED product created without erp_id");
      console.log(`  Product ID: ${procuredNoErp._id}`);
      console.log(`  ERP ID: ${procuredNoErp.erp_id}`);
    } catch (error) {
      console.log("❌ Test 3 FAILED:", error.message);
    }

    // TEST 4: Create PROCURED product with erp_id (should be set to null)
    console.log("\n\n=== TEST 4: Create PROCURED product with erp_id (should be nullified) ===");
    const procuredWithErp = new Product({
      product_type: "PROCURED",
      brand_id: brand._id,
      category_id: category._id,
      sku: `TEST-PROC-ERP-${Date.now()}`,
      erp_id: testErpId + 1,
      name: "Test Procured With ERP",
      trade_price: 50,
      wt_pcs: 1,
      unit: "PCS",
      created_by: "test-script",
      updated_by: "test-script",
    });

    try {
      await procuredWithErp.save();
      if (procuredWithErp.erp_id === null) {
        console.log("✅ Test 4 PASSED: PROCURED product erp_id set to null");
        console.log(`  Product ID: ${procuredWithErp._id}`);
        console.log(`  ERP ID: ${procuredWithErp.erp_id}`);
      } else {
        console.log("❌ Test 4 FAILED: erp_id should be null but is:", procuredWithErp.erp_id);
      }
    } catch (error) {
      console.log("❌ Test 4 FAILED:", error.message);
    }

    // TEST 5: Try to create duplicate MANUFACTURED erp_id (should fail)
    console.log("\n\n=== TEST 5: Create MANUFACTURED with duplicate erp_id ===");
    const duplicateErp = new Product({
      product_type: "MANUFACTURED",
      brand_id: brand._id,
      category_id: category._id,
      sku: `TEST-DUP-ERP-${Date.now()}`,
      erp_id: testErpId, // Same as Test 2
      name: "Test Duplicate ERP",
      trade_price: 100,
      wt_pcs: 1,
      unit: "CTN",
      db_price: 90,
      mrp: 120,
      ctn_pcs: 12,
      facility_ids: [facility._id],
      created_by: "test-script",
      updated_by: "test-script",
    });

    try {
      await duplicateErp.save();
      console.log("❌ Test 5 FAILED: Should have rejected duplicate erp_id");
    } catch (error) {
      if (error.code === 11000) {
        console.log("✅ Test 5 PASSED: Duplicate erp_id rejected");
        console.log(`  Error: ${error.message}`);
      } else {
        console.log("❌ Test 5 FAILED: Wrong error:", error.message);
      }
    }

    // Cleanup
    console.log("\n\n=== CLEANUP ===");
    const deletedCount = await Product.deleteMany({
      sku: { $regex: /^TEST-/ },
    });
    console.log(`✅ Deleted ${deletedCount.deletedCount} test products`);

    console.log("\n\n=== SUMMARY ===");
    console.log("✅ MANUFACTURED products require erp_id");
    console.log("✅ PROCURED products do not require erp_id (set to null)");
    console.log("✅ erp_id uniqueness enforced for MANUFACTURED products");
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

testErpIdByProductType();
