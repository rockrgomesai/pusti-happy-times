/**
 * Seed Test Products for Demand Orders Testing
 *
 * Creates test products with proper stock allocation to test:
 * - BIS distributor (distbanana) - sees only BIS products
 * - BEV distributor - sees only BEV products
 * - BIS+BEV distributor - sees both BIS and BEV products
 *
 * Stock allocation ensures visibility of quantities for testing
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const Brand = require("./src/models/Brand");
const Facility = require("./src/models/Facility");
const Distributor = require("./src/models/Distributor");
const User = require("./src/models/User");

const MONGODB_URI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;

async function seedTestProducts() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get existing distributors to understand their setup
    console.log("📋 Fetching distributors...");
    const distributors = await Distributor.find()
      .select("name product_segment delivery_depot_id skus_exclude")
      .lean();

    console.log(`Found ${distributors.length} distributors:`);
    distributors.forEach((d) => {
      console.log(
        `  - ${d.name}: ${d.product_segment.join(", ")} | Depot ID: ${d.delivery_depot_id || "None"}`
      );
    });

    // Get depots
    console.log("\n📦 Fetching depots...");
    let depots = await Facility.find({ type: "Depot" }).select("name type").lean();

    console.log(`Found ${depots.length} depots`);

    // Create test depots if none exist
    if (depots.length === 0) {
      console.log("⚠️ No depots found. Creating test depots...");

      // Get a user to use as creator (any user will do)
      const adminUser = await User.findOne({ role: "Admin" }).select("_id").lean();
      const creatorId = adminUser?._id || new mongoose.Types.ObjectId();

      const testDepots = [
        {
          type: "Depot",
          name: "Test Depot Dhaka",
          location: "Dhaka, Bangladesh",
          address: "Dhaka, Bangladesh",
          active: true,
          created_at: new Date(),
          created_by: creatorId,
          updated_at: new Date(),
          updated_by: creatorId,
        },
        {
          type: "Depot",
          name: "Test Depot Chittagong",
          location: "Chittagong, Bangladesh",
          address: "Chittagong, Bangladesh",
          active: true,
          created_at: new Date(),
          created_by: creatorId,
          updated_at: new Date(),
          updated_by: creatorId,
        },
      ];

      const createdDepots = await Facility.insertMany(testDepots);
      console.log(`✅ Created ${createdDepots.length} test depots`);
      depots = createdDepots;
    }

    depots.forEach((f) => console.log(`  - ${f.name} (${f._id})`));

    if (depots.length === 0) {
      console.error("❌ Failed to create depots!");
      process.exit(1);
    }

    // Get BIS and BEV categories
    console.log("\n📂 Fetching categories...");
    const bisCategories = await Category.find({
      active: true,
      product_segment: "BIS",
      parent_id: { $ne: null }, // Get leaf categories
    })
      .select("name product_segment")
      .lean();

    const bevCategories = await Category.find({
      active: true,
      product_segment: "BEV",
      parent_id: { $ne: null }, // Get leaf categories
    })
      .select("name product_segment")
      .lean();

    console.log(
      `Found ${bisCategories.length} BIS categories and ${bevCategories.length} BEV categories`
    );

    if (bisCategories.length === 0 && bevCategories.length === 0) {
      console.error("❌ No categories found! Please seed categories first.");
      process.exit(1);
    }

    // Get brands
    console.log("\n🏷️ Fetching brands...");
    const brands = await Brand.find({ active: true }).select("name").lean();
    console.log(`Found ${brands.length} brands`);

    if (brands.length === 0) {
      console.error("❌ No brands found! Please seed brands first.");
      process.exit(1);
    }

    // Use first depot for stock allocation
    const primaryDepot = depots[0];
    const secondaryDepot = depots[1] || depots[0];

    console.log(`\n📍 Using depots for stock:`);
    console.log(`  Primary: ${primaryDepot.name}`);
    console.log(`  Secondary: ${secondaryDepot.name}`);

    // Delete existing test products
    console.log("\n🗑️ Cleaning up existing test products...");
    const testSKUs = [
      "TEST-BIS-001",
      "TEST-BIS-002",
      "TEST-BIS-003",
      "TEST-BIS-004",
      "TEST-BIS-005",
      "TEST-BEV-001",
      "TEST-BEV-002",
      "TEST-BEV-003",
      "TEST-BEV-004",
      "TEST-BEV-005",
    ];
    const deleteResult = await Product.deleteMany({ sku: { $in: testSKUs } });
    console.log(`Deleted ${deleteResult.deletedCount} existing test products`);

    // Prepare test products
    const testProducts = [];

    // BIS Products (5 products)
    if (bisCategories.length > 0) {
      const bisCategory = bisCategories[0];
      const brand = brands[0];

      console.log(`\n🍚 Creating BIS products in category: ${bisCategory.name}`);

      for (let i = 1; i <= 5; i++) {
        testProducts.push({
          product_type: "MANUFACTURED",
          brand_id: brand._id,
          category_id: bisCategory._id,
          sku: `TEST-BIS-00${i}`,
          trade_price: 100 + i * 10,
          unit: "BAG",
          wt_pcs: 500 * i, // 500g, 1kg, 1.5kg, 2kg, 2.5kg
          active: true,
          bangla_name: `পরীক্ষা বিস ${i}`,
          erp_id: 9000 + i,
          depot_ids: [primaryDepot._id, secondaryDepot._id],
          facility_ids: [primaryDepot._id, secondaryDepot._id],
          db_price: 90 + i * 10,
          mrp: 120 + i * 10,
          ctn_pcs: 10 + i,
          launch_date: new Date("2024-01-01"),
          decommission_date: null,
          image_url: null,
          stock_by_depot: [
            {
              depot_id: primaryDepot._id,
              quantity: 100 * i, // 100, 200, 300, 400, 500
            },
            {
              depot_id: secondaryDepot._id,
              quantity: 50 * i, // 50, 100, 150, 200, 250
            },
          ],
          created_at: new Date(),
          created_by: "seed-script",
          updated_at: new Date(),
          updated_by: "seed-script",
        });
      }
    }

    // BEV Products (5 products)
    if (bevCategories.length > 0) {
      const bevCategory = bevCategories[0];
      const brand = brands[brands.length - 1]; // Use different brand

      console.log(`🥤 Creating BEV products in category: ${bevCategory.name}`);

      for (let i = 1; i <= 5; i++) {
        testProducts.push({
          product_type: "MANUFACTURED",
          brand_id: brand._id,
          category_id: bevCategory._id,
          sku: `TEST-BEV-00${i}`,
          trade_price: 50 + i * 5,
          unit: "BOX",
          wt_pcs: 250 * i, // 250ml, 500ml, 750ml, 1L, 1.25L
          active: true,
          bangla_name: `পরীক্ষা পানীয় ${i}`,
          erp_id: 9100 + i,
          depot_ids: [primaryDepot._id, secondaryDepot._id],
          facility_ids: [primaryDepot._id, secondaryDepot._id],
          db_price: 45 + i * 5,
          mrp: 60 + i * 5,
          ctn_pcs: 12 + i,
          launch_date: new Date("2024-01-01"),
          decommission_date: null,
          image_url: null,
          stock_by_depot: [
            {
              depot_id: primaryDepot._id,
              quantity: 80 * i, // 80, 160, 240, 320, 400
            },
            {
              depot_id: secondaryDepot._id,
              quantity: 40 * i, // 40, 80, 120, 160, 200
            },
          ],
          created_at: new Date(),
          created_by: "seed-script",
          updated_at: new Date(),
          updated_by: "seed-script",
        });
      }
    }

    // Insert test products
    console.log(`\n📦 Inserting ${testProducts.length} test products...`);
    const insertedProducts = await Product.insertMany(testProducts);
    console.log(`✅ Successfully inserted ${insertedProducts.length} products\n`);

    // Display summary
    console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
    console.log(
      "║                        TEST PRODUCTS SUMMARY                                  ║"
    );
    console.log("╠══════════════════════════════════════════════════════════════════════════════╣");
    console.log(
      "║                                                                               ║"
    );

    // BIS Products Summary
    const bisProducts = insertedProducts.filter((p) => p.sku.includes("BIS"));
    if (bisProducts.length > 0) {
      console.log(
        "║  📦 BIS PRODUCTS (for BIS and BIS+BEV distributors)                          ║"
      );
      console.log(
        "║                                                                               ║"
      );
      bisProducts.forEach((p) => {
        const stockByDepot = p.stock_by_depot || [];
        const primaryQty =
          stockByDepot.find(
            (s) => s.depot_id && s.depot_id.toString() === primaryDepot._id.toString()
          )?.quantity || 0;
        const secondaryQty =
          stockByDepot.find(
            (s) => s.depot_id && s.depot_id.toString() === secondaryDepot._id.toString()
          )?.quantity || 0;
        const totalQty = primaryQty + secondaryQty;
        console.log(
          `║  ${p.sku.padEnd(15)} | MRP: ৳${p.mrp.toString().padStart(4)} | Stock: ${totalQty.toString().padStart(3)} units${" ".repeat(23)}║`
        );
      });
      console.log(
        "║                                                                               ║"
      );
    }

    // BEV Products Summary
    const bevProducts = insertedProducts.filter((p) => p.sku.includes("BEV"));
    if (bevProducts.length > 0) {
      console.log(
        "║  🥤 BEV PRODUCTS (for BEV and BIS+BEV distributors)                          ║"
      );
      console.log(
        "║                                                                               ║"
      );
      bevProducts.forEach((p) => {
        const stockByDepot = p.stock_by_depot || [];
        const primaryQty =
          stockByDepot.find(
            (s) => s.depot_id && s.depot_id.toString() === primaryDepot._id.toString()
          )?.quantity || 0;
        const secondaryQty =
          stockByDepot.find(
            (s) => s.depot_id && s.depot_id.toString() === secondaryDepot._id.toString()
          )?.quantity || 0;
        const totalQty = primaryQty + secondaryQty;
        console.log(
          `║  ${p.sku.padEnd(15)} | MRP: ৳${p.mrp.toString().padStart(4)} | Stock: ${totalQty.toString().padStart(3)} units${" ".repeat(23)}║`
        );
      });
      console.log(
        "║                                                                               ║"
      );
    }

    console.log("╠══════════════════════════════════════════════════════════════════════════════╣");
    console.log(
      "║  TESTING SCENARIOS:                                                           ║"
    );
    console.log(
      "║                                                                               ║"
    );
    console.log(
      "║  1. BIS Distributor (distbanana):                                             ║"
    );
    console.log(
      "║     - Should see 5 BIS products only                                          ║"
    );
    console.log(
      "║     - Should NOT see any BEV products                                         ║"
    );
    console.log(
      "║                                                                               ║"
    );
    console.log(
      "║  2. BEV Distributor:                                                          ║"
    );
    console.log(
      "║     - Should see 5 BEV products only                                          ║"
    );
    console.log(
      "║     - Should NOT see any BIS products                                         ║"
    );
    console.log(
      "║                                                                               ║"
    );
    console.log(
      "║  3. BIS+BEV Distributor:                                                      ║"
    );
    console.log(
      "║     - Should see all 10 products (5 BIS + 5 BEV)                              ║"
    );
    console.log(
      "║     - Products grouped by their categories                                    ║"
    );
    console.log(
      "║                                                                               ║"
    );
    console.log(
      "║  Stock quantities are visible and can be ordered!                             ║"
    );
    console.log("╚══════════════════════════════════════════════════════════════════════════════╝");

    console.log("\n✅ Test products seeded successfully!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding test products:", error);
    process.exit(1);
  }
}

// Run the seeder
seedTestProducts();
