/**
 * Create Test Secondary Offers for Distributor-0001 and Distributor-0002
 * For mobile app secondary sales testing
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Require models
const SecondaryOffer = require("../src/models/SecondaryOffer");
const Distributor = require("../src/models/Distributor");
const Territory = require("../src/models/Territory");
const Product = require("../src/models/Product");
const User = require("../src/models/User");

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function createTestSecondaryOffers() {
  try {
    await mongoose.connect(MONGO_URI, {
      directConnection: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Connected to MongoDB\n");

    // Get the two test distributors (use the first two available)
    const distributors = await Distributor.find({ active: true }).sort({ name: 1 }).limit(2).lean();

    if (distributors.length < 2) {
      console.error("❌ Could not find at least 2 active distributors");
      console.log(
        "   Found:",
        distributors.map((d) => d.name)
      );
      return;
    }

    const dist1 = distributors[0];
    const dist2 = distributors[1];

    console.log("📦 Using these distributors for testing:");
    console.log(`   - ${dist1.name} (${dist1._id})`);
    console.log(`   - ${dist2.name} (${dist2._id})`);

    // Get their DB Point and territory hierarchy
    const dbPoint = await Territory.findById(dist1.db_point_id).lean();
    const area = await Territory.findById(dbPoint.parent_id).lean();
    const region = await Territory.findById(area.parent_id).lean();
    const zone = await Territory.findById(region.parent_id).lean();

    console.log("\n🗺️  Territory Hierarchy:");
    console.log(`   Zone: ${zone.name} (${zone._id})`);
    console.log(`   Region: ${region.name} (${region._id})`);
    console.log(`   Area: ${area.name} (${area._id})`);
    console.log(`   DB Point: ${dbPoint.name} (${dbPoint._id})`);

    // Get some products for offers
    const allProducts = await Product.find({
      active: true,
    })
      .limit(15)
      .lean();

    const productsForOffers = allProducts.slice(0, 10);

    console.log(`\n📦 Found ${allProducts.length} active products for offers`);

    // Get superadmin for created_by
    const superadmin = await User.findOne({ username: "superadmin" });
    const userId = superadmin._id;

    // Current date for active offers
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1); // Started yesterday
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 2); // Ends in 2 months

    console.log(
      `\n🎯 Creating Secondary Offers (${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]})...`
    );

    const offers = [];

    // 1. FLAT_DISCOUNT_PCT - 10% off on all BIS products
    offers.push({
      name: "Mobile Test - 10% Off BIS Products",
      offer_type: "FLAT_DISCOUNT_PCT",
      product_segments: ["BIS"],
      start_date: startDate,
      end_date: endDate,
      status: "Active",
      active: true,
      description: "Test offer for mobile app - 10% discount on all BIS products",
      territories: {
        zones: { ids: [zone._id], mode: "include" },
        regions: { ids: [region._id], mode: "include" },
        areas: { ids: [area._id], mode: "include" },
        db_points: { ids: [dbPoint._id], mode: "include" },
      },
      targeting: {
        distributors: {
          ids: [dist1._id, dist2._id],
          mode: "include",
          applyToAllRoutes: true,
        },
        routes: {
          ids: [],
          mode: "include",
          applyToAllOutlets: true,
        },
      },
      outlets: {
        selectionMode: "all",
        ids: [],
        mode: "include",
      },
      config: {
        applyToAllProducts: true,
        discountPercentage: 10,
        minOrderValue: 1000,
      },
      created_by: userId,
      updated_by: userId,
    });

    // 2. FLAT_DISCOUNT_AMT - ৳500 off on orders above ৳5000
    offers.push({
      name: "Mobile Test - ৳500 Off on BEV Orders",
      offer_type: "FLAT_DISCOUNT_AMT",
      product_segments: ["BEV"],
      start_date: startDate,
      end_date: endDate,
      status: "Active",
      active: true,
      description: "Test offer for mobile app - ৳500 discount on BEV orders above ৳5000",
      territories: {
        zones: { ids: [zone._id], mode: "include" },
        regions: { ids: [region._id], mode: "include" },
        areas: { ids: [area._id], mode: "include" },
        db_points: { ids: [dbPoint._id], mode: "include" },
      },
      targeting: {
        distributors: {
          ids: [dist1._id, dist2._id],
          mode: "include",
          applyToAllRoutes: true,
        },
        routes: {
          ids: [],
          mode: "include",
          applyToAllOutlets: true,
        },
      },
      outlets: {
        selectionMode: "all",
        ids: [],
        mode: "include",
      },
      config: {
        applyToAllProducts: true,
        discountAmount: 500,
        minOrderValue: 5000,
      },
      created_by: userId,
      updated_by: userId,
    });

    // 3. BOGO - Buy 2 Get 1 Free on specific product
    if (productsForOffers.length >= 1) {
      offers.push({
        name: "Mobile Test - Buy 2 Get 1 Free",
        offer_type: "BOGO",
        product_segments: ["BIS"],
        start_date: startDate,
        end_date: endDate,
        status: "Active",
        active: true,
        description: "Test offer for mobile app - Buy 2 Get 1 Free on selected product",
        territories: {
          zones: { ids: [zone._id], mode: "include" },
          regions: { ids: [region._id], mode: "include" },
          areas: { ids: [area._id], mode: "include" },
          db_points: { ids: [dbPoint._id], mode: "include" },
        },
        targeting: {
          distributors: {
            ids: [dist1._id, dist2._id],
            mode: "include",
            applyToAllRoutes: true,
          },
          routes: {
            ids: [],
            mode: "include",
            applyToAllOutlets: true,
          },
        },
        outlets: {
          selectionMode: "all",
          ids: [],
          mode: "include",
        },
        config: {
          selectedProducts: [productsForOffers[0]._id],
          applyToAllProducts: false,
          buyQuantity: 2,
          getQuantity: 1,
        },
        created_by: userId,
        updated_by: userId,
      });
    }

    // 4. FREE_PRODUCT - Free gift with purchase above ৳10000
    if (productsForOffers.length >= 2) {
      offers.push({
        name: "Mobile Test - Free Gift with Purchase",
        offer_type: "FREE_PRODUCT",
        product_segments: ["BIS"],
        start_date: startDate,
        end_date: endDate,
        status: "Active",
        active: true,
        description: "Test offer for mobile app - Free product when order exceeds ৳10000",
        territories: {
          zones: { ids: [zone._id], mode: "include" },
          regions: { ids: [region._id], mode: "include" },
          areas: { ids: [area._id], mode: "include" },
          db_points: { ids: [dbPoint._id], mode: "include" },
        },
        targeting: {
          distributors: {
            ids: [dist1._id, dist2._id],
            mode: "include",
            applyToAllRoutes: true,
          },
          routes: {
            ids: [],
            mode: "include",
            applyToAllOutlets: true,
          },
        },
        outlets: {
          selectionMode: "all",
          ids: [],
          mode: "include",
        },
        config: {
          minOrderValue: 10000,
          qualifierProducts: [
            {
              productId: productsForOffers[0]._id,
              minQuantity: 1,
            },
          ],
          rewardProducts: [
            {
              productId: productsForOffers[1]._id,
              freeQuantity: 2,
            },
          ],
          qualifierLogic: "AND",
          distributionMode: "all",
        },
        created_by: userId,
        updated_by: userId,
      });
    }

    // 5. VOLUME_DISCOUNT - Tiered discount based on quantity
    offers.push({
      name: "Mobile Test - Volume Discount (Tiered)",
      offer_type: "VOLUME_DISCOUNT",
      product_segments: ["BIS", "BEV"],
      start_date: startDate,
      end_date: endDate,
      status: "Active",
      active: true,
      description: "Test offer for mobile app - Higher discount for larger quantities",
      territories: {
        zones: { ids: [zone._id], mode: "include" },
        regions: { ids: [region._id], mode: "include" },
        areas: { ids: [area._id], mode: "include" },
        db_points: { ids: [dbPoint._id], mode: "include" },
      },
      targeting: {
        distributors: {
          ids: [dist1._id, dist2._id],
          mode: "include",
          applyToAllRoutes: true,
        },
        routes: {
          ids: [],
          mode: "include",
          applyToAllOutlets: true,
        },
      },
      outlets: {
        selectionMode: "all",
        ids: [],
        mode: "include",
      },
      config: {
        applyToAllProducts: true,
        volumeSlabs: [
          { minQuantity: 10, maxQuantity: 49, discountPercentage: 5 },
          { minQuantity: 50, maxQuantity: 99, discountPercentage: 10 },
          { minQuantity: 100, maxQuantity: 999999, discountPercentage: 15 },
        ],
      },
      created_by: userId,
      updated_by: userId,
    });

    // 6. BUNDLE_OFFER - Bundle of 2 products at special price
    if (productsForOffers.length >= 2) {
      const bundleProduct1 = productsForOffers[2];
      const bundleProduct2 = productsForOffers[3];
      const estimatedBundlePrice = 800; // Fixed bundle price

      offers.push({
        name: "Mobile Test - Bundle Offer (2 Products)",
        offer_type: "BUNDLE_OFFER",
        product_segments: ["BIS"],
        start_date: startDate,
        end_date: endDate,
        status: "Active",
        active: true,
        description: "Test offer for mobile app - Buy 2 products together at special price",
        territories: {
          zones: { ids: [zone._id], mode: "include" },
          regions: { ids: [region._id], mode: "include" },
          areas: { ids: [area._id], mode: "include" },
          db_points: { ids: [dbPoint._id], mode: "include" },
        },
        targeting: {
          distributors: {
            ids: [dist1._id, dist2._id],
            mode: "include",
            applyToAllRoutes: true,
          },
          routes: {
            ids: [],
            mode: "include",
            applyToAllOutlets: true,
          },
        },
        outlets: {
          selectionMode: "all",
          ids: [],
          mode: "include",
        },
        config: {
          buyProducts: [
            { productId: bundleProduct1._id, quantity: 1 },
            { productId: bundleProduct2._id, quantity: 1 },
          ],
          bundlePrice: estimatedBundlePrice,
        },
        created_by: userId,
        updated_by: userId,
      });
    }

    // 7. DISCOUNT_SLAB_PCT - Percentage discount based on order value
    offers.push({
      name: "Mobile Test - Order Value Discount Slabs",
      offer_type: "DISCOUNT_SLAB_PCT",
      product_segments: ["BIS", "BEV"],
      start_date: startDate,
      end_date: endDate,
      status: "Active",
      active: true,
      description: "Test offer for mobile app - Higher discount for larger order values",
      territories: {
        zones: { ids: [zone._id], mode: "include" },
        regions: { ids: [region._id], mode: "include" },
        areas: { ids: [area._id], mode: "include" },
        db_points: { ids: [dbPoint._id], mode: "include" },
      },
      targeting: {
        distributors: {
          ids: [dist1._id, dist2._id],
          mode: "include",
          applyToAllRoutes: true,
        },
        routes: {
          ids: [],
          mode: "include",
          applyToAllOutlets: true,
        },
      },
      outlets: {
        selectionMode: "all",
        ids: [],
        mode: "include",
      },
      config: {
        applyToAllProducts: true,
        slabs: [
          { minValue: 2000, maxValue: 4999, discountPercentage: 5 },
          { minValue: 5000, maxValue: 9999, discountPercentage: 8 },
          { minValue: 10000, maxValue: 99999999, discountPercentage: 12 },
        ],
      },
      created_by: userId,
      updated_by: userId,
    });

    console.log(`\n💾 Inserting ${offers.length} secondary offers...`);

    // Insert offers
    const created = await SecondaryOffer.insertMany(offers);

    console.log(`✅ Created ${created.length} secondary offers:\n`);
    created.forEach((offer, idx) => {
      console.log(`${idx + 1}. ${offer.name}`);
      console.log(`   Type: ${offer.offer_type}`);
      console.log(`   Segments: ${offer.product_segments.join(", ")}`);
      console.log(`   Status: ${offer.status}`);
      console.log(`   ID: ${offer._id}`);
      console.log("");
    });

    console.log("\n📱 These offers are now ready for mobile app testing!");
    console.log("   They will apply to all outlets served by:");
    console.log(`   - ${dist1.name}`);
    console.log(`   - ${dist2.name}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

createTestSecondaryOffers();
