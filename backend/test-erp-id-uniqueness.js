/**
 * Test script to verify erp_id uniqueness
 * 1. Create a new product with a unique erp_id
 * 2. Try to create another product with the same erp_id (should fail)
 * 3. Edit an existing product without changing erp_id (should succeed)
 * 4. Try to edit a product to use another product's erp_id (should fail)
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function testErpIdUniqueness() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const Product = require("./src/models/Product");
    const Brand = mongoose.connection.db.collection("brands");
    const Category = mongoose.connection.db.collection("categories");
    const Facility = mongoose.connection.db.collection("facilities");

    // Get a brand and category for testing
    const brand = await Brand.findOne();
    const category = await Category.findOne();
    const facility = await Facility.findOne({ type: "Factory" });

    if (!brand || !category || !facility) {
      console.error("❌ No brand, category, or facility found in database");
      process.exit(1);
    }

    console.log("\n📦 Test data:");
    console.log(`  Brand: ${brand.name} (${brand._id})`);
    console.log(`  Category: ${category.name} (${category._id})`);
    console.log(`  Facility: ${facility.name} (${facility._id})`);

    // Find the highest erp_id
    const maxProduct = await Product.findOne().sort({ erp_id: -1 });
    const testErpId1 = (maxProduct?.erp_id || 1000) + 100;
    const testErpId2 = testErpId1 + 1;

    console.log(`\n🔢 Test ERP IDs: ${testErpId1}, ${testErpId2}`);

    // Test 1: Create a new product with unique erp_id
    console.log("\n\n=== TEST 1: Create new product with unique erp_id ===");
    const newProduct = new Product({
      product_type: "MANUFACTURED",
      brand_id: brand._id,
      category_id: category._id,
      sku: `TEST-SKU-${Date.now()}`,
      erp_id: testErpId1,
      name: "Test Product 1",
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
      await newProduct.save();
      console.log("✅ Test 1 PASSED: Product created successfully");
      console.log(`  Product ID: ${newProduct._id}`);
      console.log(`  ERP ID: ${newProduct.erp_id}`);
    } catch (error) {
      console.log("❌ Test 1 FAILED:", error.message);
    }

    // Test 2: Try to create another product with the same erp_id
    console.log("\n\n=== TEST 2: Try to create product with duplicate erp_id ===");
    const duplicateProduct = new Product({
      product_type: "MANUFACTURED",
      brand_id: brand._id,
      category_id: category._id,
      sku: `TEST-SKU-DUP-${Date.now()}`,
      erp_id: testErpId1, // Same as Test 1
      name: "Test Product Duplicate",
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
      await duplicateProduct.save();
      console.log("❌ Test 2 FAILED: Should have thrown duplicate error but succeeded");
    } catch (error) {
      if (error.code === 11000 || error.message.includes("duplicate")) {
        console.log("✅ Test 2 PASSED: Duplicate erp_id rejected");
        console.log(`  Error: ${error.message}`);
      } else {
        console.log("❌ Test 2 FAILED: Wrong error thrown:", error.message);
      }
    }

    // Test 3: Edit existing product without changing erp_id
    console.log("\n\n=== TEST 3: Edit product without changing erp_id ===");
    try {
      newProduct.name = "Test Product 1 - Updated";
      newProduct.trade_price = 110;
      await newProduct.save();
      console.log("✅ Test 3 PASSED: Product updated successfully");
      console.log(`  New name: ${newProduct.name}`);
      console.log(`  New trade_price: ${newProduct.trade_price}`);
    } catch (error) {
      console.log("❌ Test 3 FAILED:", error.message);
    }

    // Test 4: Create second product and try to change its erp_id to duplicate
    console.log("\n\n=== TEST 4: Create second product and try to change erp_id to duplicate ===");
    const secondProduct = new Product({
      product_type: "MANUFACTURED",
      brand_id: brand._id,
      category_id: category._id,
      sku: `TEST-SKU-2-${Date.now()}`,
      erp_id: testErpId2, // Different erp_id
      name: "Test Product 2",
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
      await secondProduct.save();
      console.log("✅ Second product created with erp_id:", secondProduct.erp_id);

      // Now try to change it to duplicate
      secondProduct.erp_id = testErpId1; // Try to use same as Test 1
      await secondProduct.save();
      console.log("❌ Test 4 FAILED: Should have thrown duplicate error but succeeded");
    } catch (error) {
      if (error.code === 11000 || error.message.includes("duplicate")) {
        console.log("✅ Test 4 PASSED: Duplicate erp_id on update rejected");
        console.log(`  Error: ${error.message}`);
      } else {
        console.log("❌ Test 4 FAILED: Wrong error thrown:", error.message);
      }
    }

    // Cleanup test products
    console.log("\n\n=== CLEANUP ===");
    const deletedCount = await Product.deleteMany({
      sku: { $regex: /^TEST-SKU/ },
    });
    console.log(`✅ Deleted ${deletedCount.deletedCount} test products`);

    console.log("\n\n=== SUMMARY ===");
    console.log("All tests completed. Check results above.");
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

testErpIdUniqueness();
