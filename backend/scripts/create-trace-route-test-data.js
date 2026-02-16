/**
 * Create 200+ Test Outlets for Trace Route Testing
 *
 * Distribution:
 * - Cluster 1 (Kawran Bazar): 90 outlets (60 at center, 30 within 150m)
 * - Cluster 2 (Gulshan-1): 90 outlets (55 at center, 35 within 200m)
 * - Independent: 40 outlets scattered across Dhaka
 * Total: 220 outlets
 *
 * Route: R1-DPBEV1-D1 (assigned to SO1-ABIS for Saturday)
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

// Cluster centers (realistic Dhaka commercial areas)
const CLUSTER_1 = {
  name: "Kawran Bazar",
  lat: 23.7505,
  lng: 90.3919,
  radius: 0.00135, // ~150 meters
  atCenter: 60,
  scattered: 30,
};

const CLUSTER_2 = {
  name: "Gulshan-1",
  lat: 23.7808,
  lng: 90.4161,
  radius: 0.0018, // ~200 meters
  atCenter: 55,
  scattered: 35,
};

const INDEPENDENT_COUNT = 40;

// Dhaka area coordinates for scattered outlets
const dhakaLocations = [
  { name: "Mirpur", lat: 23.8223, lng: 90.3654 },
  { name: "Uttara", lat: 23.8759, lng: 90.3795 },
  { name: "Dhanmondi", lat: 23.7461, lng: 90.3742 },
  { name: "Mohammadpur", lat: 23.7658, lng: 90.3593 },
  { name: "Banani", lat: 23.7937, lng: 90.4066 },
  { name: "Motijheel", lat: 23.733, lng: 90.4172 },
  { name: "Tejgaon", lat: 23.7562, lng: 90.3905 },
  { name: "Badda", lat: 23.7805, lng: 90.4267 },
  { name: "Rampura", lat: 23.7574, lng: 90.4254 },
  { name: "Khilgaon", lat: 23.7514, lng: 90.4254 },
];

// Bengali number mapping
const bengaliNumbers = {
  0: "০",
  1: "১",
  2: "২",
  3: "৩",
  4: "৪",
  5: "৫",
  6: "৬",
  7: "৭",
  8: "৮",
  9: "৯",
};

function toBengaliNumber(num) {
  return String(num)
    .split("")
    .map((d) => bengaliNumbers[d] || d)
    .join("");
}

/**
 * Generate point within cluster or at center
 */
function getClusterPoint(centerLat, centerLng, radius, atCenter) {
  if (atCenter) {
    return { lat: centerLat, lng: centerLng };
  }

  // Random point within radius
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radius;

  return {
    lat: centerLat + distance * Math.cos(angle),
    lng: centerLng + distance * Math.sin(angle),
  };
}

/**
 * Get random scattered location across Dhaka
 */
function getRandomDhakaLocation() {
  const location = dhakaLocations[Math.floor(Math.random() * dhakaLocations.length)];

  // Add random offset ±50 meters for uniqueness
  const offsetLat = (Math.random() - 0.5) * 0.0009; // ~50m
  const offsetLng = (Math.random() - 0.5) * 0.0009;

  return {
    lat: location.lat + offsetLat,
    lng: location.lng + offsetLng,
    area: location.name,
  };
}

/**
 * Generate outlet data for all categories
 */
function generateOutletData() {
  const outlets = [];
  let counter = 1;

  // CLUSTER 1: Kawran Bazar
  console.log(`\n📍 Generating Cluster 1: ${CLUSTER_1.name}`);
  console.log(`   - ${CLUSTER_1.atCenter} outlets at center (${CLUSTER_1.lat}, ${CLUSTER_1.lng})`);
  console.log(
    `   - ${CLUSTER_1.scattered} outlets within ${(CLUSTER_1.radius * 111000).toFixed(0)}m radius`
  );

  for (let i = 0; i < CLUSTER_1.atCenter + CLUSTER_1.scattered; i++) {
    const isAtCenter = i < CLUSTER_1.atCenter;
    const coords = getClusterPoint(CLUSTER_1.lat, CLUSTER_1.lng, CLUSTER_1.radius, isAtCenter);

    outlets.push({
      outlet_id: `R1-DPBEV1-D1-${String(counter).padStart(3, "0")}`,
      outlet_name: `C1 Outlet ${String(counter).padStart(3, "0")}`,
      outlet_name_bangla: `সি১ আউটলেট ${toBengaliNumber(String(counter).padStart(3, "0"))}`,
      lat: coords.lat,
      lng: coords.lng,
      category: "cluster1",
      address: `${isAtCenter ? "Center" : "Near"} ${CLUSTER_1.name}, Dhaka`,
      address_bangla: `${isAtCenter ? "কেন্দ্র" : "নিকট"} ${CLUSTER_1.name}, ঢাকা`,
    });
    counter++;
  }

  // CLUSTER 2: Gulshan-1
  console.log(`\n📍 Generating Cluster 2: ${CLUSTER_2.name}`);
  console.log(`   - ${CLUSTER_2.atCenter} outlets at center (${CLUSTER_2.lat}, ${CLUSTER_2.lng})`);
  console.log(
    `   - ${CLUSTER_2.scattered} outlets within ${(CLUSTER_2.radius * 111000).toFixed(0)}m radius`
  );

  for (let i = 0; i < CLUSTER_2.atCenter + CLUSTER_2.scattered; i++) {
    const isAtCenter = i < CLUSTER_2.atCenter;
    const coords = getClusterPoint(CLUSTER_2.lat, CLUSTER_2.lng, CLUSTER_2.radius, isAtCenter);

    outlets.push({
      outlet_id: `R1-DPBEV1-D1-${String(counter).padStart(3, "0")}`,
      outlet_name: `C2 Outlet ${String(counter).padStart(3, "0")}`,
      outlet_name_bangla: `সি২ আউটলেট ${toBengaliNumber(String(counter).padStart(3, "0"))}`,
      lat: coords.lat,
      lng: coords.lng,
      category: "cluster2",
      address: `${isAtCenter ? "Center" : "Near"} ${CLUSTER_2.name}, Dhaka`,
      address_bangla: `${isAtCenter ? "কেন্দ্র" : "নিকট"} ${CLUSTER_2.name}, ঢাকা`,
    });
    counter++;
  }

  // INDEPENDENT: Scattered across Dhaka
  console.log(`\n📍 Generating Independent Outlets`);
  console.log(`   - ${INDEPENDENT_COUNT} outlets scattered across Dhaka areas`);

  for (let i = 0; i < INDEPENDENT_COUNT; i++) {
    const location = getRandomDhakaLocation();

    outlets.push({
      outlet_id: `R1-DPBEV1-D1-${String(counter).padStart(3, "0")}`,
      outlet_name: `Ind Outlet ${String(counter).padStart(3, "0")}`,
      outlet_name_bangla: `ইন্ড আউটলেট ${toBengaliNumber(String(counter).padStart(3, "0"))}`,
      lat: location.lat,
      lng: location.lng,
      category: "independent",
      address: `${location.area}, Dhaka`,
      address_bangla: `${location.area}, ঢাকা`,
    });
    counter++;
  }

  return outlets;
}

async function createTestData() {
  try {
    console.log("🚀 Starting Trace Route Test Data Generation\n");
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Define models with strict:false for flexibility
    const Route = mongoose.model("Route", new mongoose.Schema({}, { strict: false }), "routes");
    const Outlet = mongoose.model("Outlet", new mongoose.Schema({}, { strict: false }), "outlets");
    const OutletType = mongoose.model(
      "OutletType",
      new mongoose.Schema({}, { strict: false }),
      "outlet_types"
    );
    const OutletChannel = mongoose.model(
      "OutletChannel",
      new mongoose.Schema({}, { strict: false }),
      "outlet_channels"
    );
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");

    // Find route R1-DPBEV1-D1
    console.log("🔍 Finding route R1-DPBEV1-D1...");
    const route = await Route.findOne({ route_id: "R1-DPBEV1-D1" });

    if (!route) {
      console.log("❌ Route R1-DPBEV1-D1 not found!");
      console.log("   Run assign-test-routes.js first to create the route.");
      process.exit(1);
    }

    console.log(`✅ Found route: ${route.route_id} (ID: ${route._id})\n`);

    // Get or create outlet type
    let outletType = await OutletType.findOne({ active: true });
    if (!outletType) {
      console.log("⚠️  No outlet type found, creating default...");
      outletType = await OutletType.create({
        name: "Retail Shop",
        active: true,
        created_by: "system",
        updated_by: "system",
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✅ Created outlet type: ${outletType.name}`);
    } else {
      console.log(`✅ Using Outlet Type: ${outletType.name}`);
    }

    // Get or create outlet channel
    let outletChannel = await OutletChannel.findOne({ active: true });
    if (!outletChannel) {
      console.log("⚠️  No outlet channel found, creating default...");
      outletChannel = await OutletChannel.create({
        name: "General Trade",
        active: true,
        created_by: "system",
        updated_by: "system",
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✅ Created outlet channel: ${outletChannel.name}`);
    } else {
      console.log(`✅ Using Outlet Channel: ${outletChannel.name}`);
    }

    console.log("");

    // Clear existing outlets for this route
    console.log("🗑️  Clearing existing outlets for route R1-DPBEV1-D1...");
    const deleteResult = await Outlet.deleteMany({ route_id: route._id });
    console.log(`   Deleted ${deleteResult.deletedCount} existing outlets\n`);

    // Generate outlet data
    console.log("=".repeat(80));
    console.log("GENERATING OUTLET DATA");
    console.log("=".repeat(80));

    const outletData = generateOutletData();

    console.log(`\n✅ Generated ${outletData.length} outlet definitions\n`);

    // Create outlets in database
    console.log("💾 Creating outlets in database...");

    const now = new Date();
    const outletsToInsert = outletData.map((outlet) => ({
      outlet_id: outlet.outlet_id,
      outlet_name: outlet.outlet_name,
      outlet_name_bangla: outlet.outlet_name_bangla,
      route_id: route._id,
      outlet_type: outletType._id,
      outlet_channel_id: outletChannel._id,
      address: outlet.address,
      address_bangla: outlet.address_bangla,

      // GeoJSON format for MongoDB geospatial queries
      location: {
        type: "Point",
        coordinates: [outlet.lng, outlet.lat], // [longitude, latitude]
      },

      // Legacy fields for compatibility
      lati: outlet.lat,
      longi: outlet.lng,

      // Status fields
      active: true,
      verification_status: "VERIFIED",

      // Defaults
      credit_limit: 0,
      current_credit_balance: 0,
      market_size: 0,

      // Timestamps
      created_date: now,
      update_date_time: now,
      created_by: route.created_by,
      updated_by: route.updated_by,
    }));

    // Batch insert
    const createdOutlets = await Outlet.insertMany(outletsToInsert);
    console.log(`✅ Created ${createdOutlets.length} outlets in database\n`);

    // Update route with outlet IDs
    console.log("🔗 Updating route with outlet assignments...");

    const outletIds = createdOutlets.map((o) => o._id);

    // Ensure Saturday is in visit_days
    const visitDays = route.sr_assignments?.sr_1?.visit_days || [];
    if (!visitDays.includes("SAT")) {
      visitDays.push("SAT");
    }

    await Route.updateOne(
      { _id: route._id },
      {
        $set: {
          outlet_ids: outletIds,
          actual_outlet_qty: outletIds.length,
          "sr_assignments.sr_1.visit_days": visitDays,
        },
      }
    );

    console.log(`✅ Route updated with ${outletIds.length} outlets\n`);

    // Display summary
    console.log("=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));

    const cluster1Count = outletData.filter((o) => o.category === "cluster1").length;
    const cluster2Count = outletData.filter((o) => o.category === "cluster2").length;
    const independentCount = outletData.filter((o) => o.category === "independent").length;

    console.log(`\n📊 Distribution:`);
    console.log(`   🔵 Cluster 1 (${CLUSTER_1.name}): ${cluster1Count} outlets`);
    console.log(`      Center: ${CLUSTER_1.lat}, ${CLUSTER_1.lng}`);
    console.log(`      At center: ${CLUSTER_1.atCenter}, Scattered: ${CLUSTER_1.scattered}`);

    console.log(`\n   🟢 Cluster 2 (${CLUSTER_2.name}): ${cluster2Count} outlets`);
    console.log(`      Center: ${CLUSTER_2.lat}, ${CLUSTER_2.lng}`);
    console.log(`      At center: ${CLUSTER_2.atCenter}, Scattered: ${CLUSTER_2.scattered}`);

    console.log(`\n   🟡 Independent (Scattered): ${independentCount} outlets`);
    console.log(`      Distributed across: ${dhakaLocations.map((l) => l.name).join(", ")}`);

    console.log(`\n📍 Total Outlets: ${cluster1Count + cluster2Count + independentCount}`);

    // Sample coordinates
    console.log(`\n📌 Sample Coordinates:`);
    console.log(
      `   Cluster 1 Center: ${outletData.find((o) => o.category === "cluster1").outlet_name}`
    );
    console.log(
      `      → ${outletData.find((o) => o.category === "cluster1").lat}, ${outletData.find((o) => o.category === "cluster1").lng}`
    );

    console.log(
      `   Cluster 2 Center: ${outletData.find((o) => o.category === "cluster2").outlet_name}`
    );
    console.log(
      `      → ${outletData.find((o) => o.category === "cluster2").lat}, ${outletData.find((o) => o.category === "cluster2").lng}`
    );

    const firstInd = outletData.find((o) => o.category === "independent");
    console.log(`   Independent Sample: ${firstInd.outlet_name}`);
    console.log(`      → ${firstInd.lat}, ${firstInd.lng} (${firstInd.address})`);

    console.log(`\n🎯 Route Assignment:`);
    console.log(`   Route: ${route.route_id}`);
    console.log(`   Assigned to: SO1-ABIS (Check on Saturday)`);
    console.log(`   Visit Days: ${visitDays.join(", ")}`);

    console.log(`\n✅ Test data generation complete!`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Login as SO1-ABIS on mobile app`);
    console.log(`   2. On Saturday, click "Trace Route" button`);
    console.log(`   3. Map should show 2 dense clusters + scattered outlets`);
    console.log(`   4. Click any marker to see outlet details`);
  } catch (error) {
    console.error("❌ Error:", error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n📡 Database connection closed\n");
  }
}

// Run the script
createTestData();
