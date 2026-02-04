/**
 * Create Realistic Outlets for BIS/BEV Routes
 *
 * Creates outlets with realistic geographic distribution:
 * - Routes have varying outlet counts: 50, 100, or 200
 * - Routes span 200-300 meters (realistic city route)
 * - Mix of clustered outlets (same building) and individual outlets
 * - Uses Kawran Bazar, Dhaka as base location
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

// Base coordinates: Kawran Bazar, Dhaka
const BASE_LAT = 23.7505;
const BASE_LNG = 90.3919;

// Route radius in degrees (200-300 meters ≈ 0.0018 - 0.0027 degrees)
const MIN_RADIUS = 0.0018;
const MAX_RADIUS = 0.0027;

/**
 * Generate random coordinate within circular area
 */
function generateRandomPoint(centerLat, centerLng, minRadius, maxRadius) {
  const angle = Math.random() * 2 * Math.PI;
  const radius = minRadius + Math.random() * (maxRadius - minRadius);

  return {
    lat: centerLat + radius * Math.cos(angle),
    lng: centerLng + radius * Math.sin(angle),
  };
}

/**
 * Generate route outlets with clustering
 */
function generateRouteOutlets(routeName, totalOutlets) {
  const outlets = [];

  // Determine number of clusters (3-6 clusters per route)
  const numClusters = Math.floor(Math.random() * 4) + 3; // 3-6 clusters
  const outletsPerCluster = Math.floor((totalOutlets * 0.3) / numClusters); // 30% in clusters
  const individualOutlets = totalOutlets - numClusters * outletsPerCluster;

  // Generate unique base point for this route
  const routeCenter = generateRandomPoint(BASE_LAT, BASE_LNG, 0, 0.005);

  let outletCounter = 1;

  // Create clustered outlets (same building/location)
  for (let cluster = 0; cluster < numClusters; cluster++) {
    // Generate cluster center point
    const clusterPoint = generateRandomPoint(
      routeCenter.lat,
      routeCenter.lng,
      MIN_RADIUS * 0.3,
      MAX_RADIUS * 0.8
    );

    // Add 2-5 outlets at this exact location
    const shopsInCluster = Math.floor(Math.random() * 4) + 2; // 2-5 shops

    for (let shop = 0; shop < shopsInCluster && outletCounter <= totalOutlets; shop++) {
      outlets.push({
        name: `${routeName}-O${outletCounter}`,
        lat: parseFloat(clusterPoint.lat.toFixed(6)),
        lng: parseFloat(clusterPoint.lng.toFixed(6)),
        isClustered: true,
        clusterGroup: cluster + 1,
      });
      outletCounter++;
    }
  }

  // Create individual outlets (unique locations)
  while (outletCounter <= totalOutlets) {
    const point = generateRandomPoint(
      routeCenter.lat,
      routeCenter.lng,
      MIN_RADIUS * 0.2,
      MAX_RADIUS
    );

    outlets.push({
      name: `${routeName}-O${outletCounter}`,
      lat: parseFloat(point.lat.toFixed(6)),
      lng: parseFloat(point.lng.toFixed(6)),
      isClustered: false,
    });
    outletCounter++;
  }

  return outlets;
}

async function createOutletsForRoutes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Route = mongoose.model("Route", new mongoose.Schema({}, { strict: false }), "routes");

    const Outlet = mongoose.model("Outlet", new mongoose.Schema({}, { strict: false }), "outlets");

    const OutletType = mongoose.model(
      "OutletType",
      new mongoose.Schema({}, { strict: false }),
      "outlet_types"
    );

    const Channel = mongoose.model(
      "Channel",
      new mongoose.Schema({}, { strict: false }),
      "channels"
    );

    const MarketSize = mongoose.model(
      "MarketSize",
      new mongoose.Schema({}, { strict: false }),
      "market_sizes"
    );

    // Get reference data
    console.log("📋 Loading reference data...");
    const outletTypes = await OutletType.find({ active: true });
    const channels = await Channel.find({ active: true });
    const marketSizes = await MarketSize.find({ active: true });

    if (outletTypes.length === 0 || channels.length === 0 || marketSizes.length === 0) {
      console.log("\n⚠️  Warning: Missing reference data");
      console.log(`   Outlet Types: ${outletTypes.length}`);
      console.log(`   Channels: ${channels.length}`);
      console.log(`   Market Sizes: ${marketSizes.length}`);
      console.log("\n   Using fallback values...\n");
    } else {
      console.log(`✅ Outlet Types: ${outletTypes.length}`);
      console.log(`✅ Channels: ${channels.length}`);
      console.log(`✅ Market Sizes: ${marketSizes.length}\n`);
    }

    // Get all BIS/BEV routes
    const routes = await Route.find({
      route_id: /^R[12]-(DPBIS|DPBEV|DPBISBEV)/,
    }).sort({ route_id: 1 });

    console.log(`📦 Found ${routes.length} routes\n`);

    // Define outlet count variations
    const outletCounts = [50, 100, 200];

    let totalOutletsCreated = 0;
    let totalClustered = 0;
    let routeStats = [];

    for (const route of routes) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🛣️  Route: ${route.name} (${route.route_id})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Check if outlets already exist for this route
      const existingCount = await Outlet.countDocuments({ route_id: route._id });
      if (existingCount > 0) {
        console.log(`ℹ️  Route already has ${existingCount} outlets. Skipping...\n`);
        continue;
      }

      // Randomly select outlet count
      const outletCount = outletCounts[Math.floor(Math.random() * outletCounts.length)];
      console.log(`📊 Creating ${outletCount} outlets for this route\n`);

      // Generate outlet coordinates
      const outletData = generateRouteOutlets(route.route_id, outletCount);

      const clusteredCount = outletData.filter((o) => o.isClustered).length;
      const individualCount = outletData.filter((o) => !o.isClustered).length;

      console.log(`   📍 Clustered outlets: ${clusteredCount}`);
      console.log(`   📍 Individual outlets: ${individualCount}`);

      // Create outlets in database
      const outletsToCreate = outletData.map((outlet, index) => {
        // Randomly select reference data
        const outletType =
          outletTypes.length > 0
            ? outletTypes[Math.floor(Math.random() * outletTypes.length)]
            : null;
        const channel =
          channels.length > 0 ? channels[Math.floor(Math.random() * channels.length)] : null;
        const marketSize =
          marketSizes.length > 0
            ? marketSizes[Math.floor(Math.random() * marketSizes.length)]
            : null;

        return {
          outlet_name: outlet.name,
          outlet_id: `${route.route_id}-${String(index + 1).padStart(3, "0")}`,
          route_id: route._id,
          distributor_id: route.distributor_id,
          outlet_type_id: outletType?._id,
          channel_id: channel?._id,
          market_size_id: marketSize?._id,
          lati: outlet.lat,
          longi: outlet.lng,
          address: outlet.isClustered
            ? `Cluster ${outlet.clusterGroup}, Kawran Bazar, Dhaka`
            : `${outlet.name}, Kawran Bazar, Dhaka`,
          contact_person: "Test Contact",
          phone: "01700000000",
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        };
      });

      // Batch insert
      const created = await Outlet.insertMany(outletsToCreate);
      console.log(`   ✅ Created ${created.length} outlets\n`);

      totalOutletsCreated += created.length;
      totalClustered += clusteredCount;

      routeStats.push({
        route: route.route_id,
        total: created.length,
        clustered: clusteredCount,
        individual: individualCount,
      });

      // Show sample coordinates
      const samples = outletData.slice(0, 3);
      console.log(`   📌 Sample coordinates:`);
      samples.forEach((s) => {
        console.log(`      ${s.name}: ${s.lat}, ${s.lng} ${s.isClustered ? "(Clustered)" : ""}`);
      });
    }

    console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All outlets created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Overall Summary:");
    console.log(`   Total Routes Processed: ${routeStats.length}`);
    console.log(`   Total Outlets Created: ${totalOutletsCreated}`);
    console.log(
      `   Clustered Outlets: ${totalClustered} (${((totalClustered / totalOutletsCreated) * 100).toFixed(1)}%)`
    );
    console.log(
      `   Individual Outlets: ${totalOutletsCreated - totalClustered} (${(((totalOutletsCreated - totalClustered) / totalOutletsCreated) * 100).toFixed(1)}%)`
    );

    console.log("\n📈 Route Distribution:");
    const counts50 = routeStats.filter((r) => r.total === 50).length;
    const counts100 = routeStats.filter((r) => r.total === 100).length;
    const counts200 = routeStats.filter((r) => r.total === 200).length;
    console.log(`   50 outlets: ${counts50} routes`);
    console.log(`   100 outlets: ${counts100} routes`);
    console.log(`   200 outlets: ${counts200} routes`);

    console.log("\n🗺️  Geographic Details:");
    console.log(`   Base Location: Kawran Bazar, Dhaka`);
    console.log(`   Coordinates: ${BASE_LAT}, ${BASE_LNG}`);
    console.log(`   Route Radius: 200-300 meters`);
    console.log(`   Clustering: 3-6 clusters per route with 2-5 outlets each`);

    console.log("\n📋 Sample Route Statistics:");
    routeStats.slice(0, 5).forEach((stat) => {
      console.log(
        `   ${stat.route}: ${stat.total} outlets (${stat.clustered} clustered, ${stat.individual} individual)`
      );
    });
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
createOutletsForRoutes();
