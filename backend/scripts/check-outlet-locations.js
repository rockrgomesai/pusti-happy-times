require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Route = require("../src/models/Route");
const Outlet = require("../src/models/Outlet");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkOutletLocations() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const route = await Route.findOne({ route_id: "R1-DPBEV1-D1" });

    if (!route) {
      console.log("❌ Route not found!");
      process.exit(1);
    }

    console.log(`🛣️  Route: ${route.route_id}`);
    console.log(`📍 Outlet IDs in route: ${route.outlet_ids.length}\n`);

    for (const outletId of route.outlet_ids) {
      const outlet = await Outlet.findById(outletId);

      if (outlet) {
        console.log(`📍 ${outlet.outlet_name || outlet.name || outlet._id}`);
        console.log(`   ID: ${outlet._id}`);
        console.log(`   Location field: ${JSON.stringify(outlet.location)}`);
        console.log(`   Latitude field: ${outlet.latitude}`);
        console.log(`   Longitude field: ${outlet.longitude}`);

        if (outlet.location && outlet.location.coordinates) {
          console.log(
            `   GeoJSON: [${outlet.location.coordinates[0]}, ${outlet.location.coordinates[1]}]`
          );
          console.log(
            `   (lng, lat): (${outlet.location.coordinates[0]}, ${outlet.location.coordinates[1]})`
          );
        }
        console.log();
      } else {
        console.log(`❌ Outlet ${outletId} not found!\n`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkOutletLocations();
