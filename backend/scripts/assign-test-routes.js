/**
 * Properly assign routes with outlets to SO1-ABIS and SO2-ABIS for testing
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Import actual models
const User = require("../src/models/User");
const Route = require("../src/models/Route");
const Outlet = require("../src/models/Outlet");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function assignTestRoutes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find SO users
    const so1 = await User.findOne({ username: "SO1-ABIS" });
    const so2 = await User.findOne({ username: "SO2-ABIS" });

    if (!so1 || !so2) {
      console.log("❌ SO users not found!");
      return;
    }

    console.log(`📍 SO1-ABIS ID: ${so1._id}`);
    console.log(`📍 SO2-ABIS ID: ${so2._id}\n`);

    // Find available routes
    const routes = await Route.find({ active: true, route_id: /^R/ }).limit(2);

    if (routes.length < 2) {
      console.log("❌ Not enough routes found!");
      return;
    }

    // Find outlets with GPS coordinates
    const outlets = await Outlet.find({
      active: true,
      $or: [
        { "location.coordinates": { $exists: true, $ne: null } },
        { latitude: { $exists: true, $ne: null } },
      ],
    }).limit(5);

    if (outlets.length === 0) {
      console.log("❌ No outlets with GPS coordinates found!");
      return;
    }

    console.log(`🛣️  Found ${routes.length} routes`);
    console.log(`📍 Found ${outlets.length} outlets with GPS\n`);

    // Assign outlets to routes
    const outletIds = outlets.map((o) => o._id);

    // Route 1 -> SO1-ABIS
    await Route.updateOne(
      { _id: routes[0]._id },
      {
        $set: {
          "sr_assignments.sr_1": {
            sr_id: so1._id,
            visit_days: ["SAT", "MON", "WED"],
          },
          outlet_ids: outletIds,
        },
      }
    );

    console.log(`✅ Route ${routes[0].route_id} assigned to SO1-ABIS`);
    console.log(`   Visit days: SAT, MON, WED`);
    console.log(`   Outlets: ${outletIds.length}\n`);

    // Route 2 -> SO2-ABIS
    await Route.updateOne(
      { _id: routes[1]._id },
      {
        $set: {
          "sr_assignments.sr_1": {
            sr_id: so2._id,
            visit_days: ["SAT", "TUE", "THU"],
          },
          outlet_ids: outletIds,
        },
      }
    );

    console.log(`✅ Route ${routes[1].route_id} assigned to SO2-ABIS`);
    console.log(`   Visit days: SAT, TUE, THU`);
    console.log(`   Outlets: ${outletIds.length}\n`);

    // Display test coordinates
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 TEST GPS COORDINATES (within 20m)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    for (const outlet of outlets.slice(0, 3)) {
      const lat = outlet.location?.coordinates?.[1] || outlet.latitude;
      const lng = outlet.location?.coordinates?.[0] || outlet.longitude;

      if (lat && lng) {
        // Generate point within 15m (safe margin)
        const mockLat = lat + (Math.random() - 0.5) * 0.00015;
        const mockLng = lng + (Math.random() - 0.5) * 0.00015;

        console.log(`📍 ${outlet.outlet_name || outlet.name || "Outlet"}`);
        console.log(`   Actual:  ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        console.log(`   Mock:    ${mockLat.toFixed(6)}, ${mockLng.toFixed(6)}`);
        console.log(`   ID:      ${outlet._id}\n`);
      }
    }

    console.log(
      "✅ Setup complete! Login as SO1-ABIS or SO2-ABIS and use mock coordinates above.\n"
    );

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.connection.close();
  }
}

assignTestRoutes();
