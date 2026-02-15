const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function getRouteOutlets() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Route = mongoose.model("Route", new mongoose.Schema({}, { strict: false }), "routes");
    const Outlet = mongoose.model("Outlet", new mongoose.Schema({}, { strict: false }), "outlets");
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");

    // Find SO1-ABIS and SO2-ABIS users
    const so1 = await User.findOne({ username: "SO1-ABIS" });
    const so2 = await User.findOne({ username: "SO2-ABIS" });

    if (!so1) {
      console.log("❌ SO1-ABIS not found");
      return;
    }

    console.log(`📍 Found SO1-ABIS: ${so1._id}\n`);

    // Find routes assigned to SO1-ABIS
    const routes = await Route.find({
      $or: [
        { "sr_assignments.sr_1.sr_id": so1._id },
        { "sr_assignments.sr_2.sr_id": so1._id },
      ],
    });

    console.log(`🛣️  Found ${routes.length} routes for SO1-ABIS:\n`);

    for (const route of routes) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Route: ${route.route_id || route.route_name}`);
      console.log(`Visit Days: ${route.sr_assignments?.sr_1?.visit_days?.join(", ") || "N/A"}`);
      
      // Check if this route has outlets
      if (!route.outlet_ids || route.outlet_ids.length === 0) {
        console.log(`⚠️  No outlets in this route!\n`);
        
        // Find some outlets to assign
        const availableOutlets = await Outlet.find({ active: true }).limit(3);
        
        if (availableOutlets.length > 0) {
          console.log(`📍 Found ${availableOutlets.length} available outlets to assign:\n`);
          
          const outletIds = availableOutlets.map(o => o._id);
          route.outlet_ids = outletIds;
          await route.save();
          
          console.log(`✅ Assigned ${outletIds.length} outlets to route ${route.route_id}\n`);
          
          // Display outlet details with mock GPS
          for (const outlet of availableOutlets) {
            const lat = outlet.location?.coordinates?.[1] || outlet.latitude;
            const lng = outlet.location?.coordinates?.[0] || outlet.longitude;
            
            if (lat && lng) {
              // Generate a point within 15 meters (safe distance < 20m threshold)
              const mockLat = lat + (Math.random() - 0.5) * 0.0002; // ~11m variation
              const mockLng = lng + (Math.random() - 0.5) * 0.0002;
              
              console.log(`  📍 ${outlet.outlet_name || outlet.name}`);
              console.log(`     Actual: ${lat}, ${lng}`);
              console.log(`     Mock (within 20m): ${mockLat.toFixed(6)}, ${mockLng.toFixed(6)}`);
              console.log(`     Outlet ID: ${outlet._id}\n`);
            } else {
              console.log(`  ⚠️  ${outlet.outlet_name || outlet.name} - No GPS coordinates!\n`);
            }
          }
        } else {
          console.log(`❌ No outlets found in database!\n`);
        }
      } else {
        console.log(`📍 Has ${route.outlet_ids.length} outlets\n`);
        
        // Get first 3 outlets details
        const outlets = await Outlet.find({ _id: { $in: route.outlet_ids.slice(0, 3) } });
        
        for (const outlet of outlets) {
          const lat = outlet.location?.coordinates?.[1] || outlet.latitude;
          const lng = outlet.location?.coordinates?.[0] || outlet.longitude;
          
          if (lat && lng) {
            // Generate a point within 15 meters
            const mockLat = lat + (Math.random() - 0.5) * 0.0002;
            const mockLng = lng + (Math.random() - 0.5) * 0.0002;
            
            console.log(`  📍 ${outlet.outlet_name || outlet.name}`);
            console.log(`     Actual: ${lat}, ${lng}`);
            console.log(`     Mock (within 20m): ${mockLat.toFixed(6)}, ${mockLng.toFixed(6)}`);
            console.log(`     Outlet ID: ${outlet._id}\n`);
          } else {
            console.log(`  ⚠️  ${outlet.outlet_name || outlet.name} - No GPS coordinates!\n`);
          }
        }
      }
    }

    console.log(`\n📝 TESTING INSTRUCTIONS:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`1. Use the "Mock" coordinates above in your mobile app`);
    console.log(`2. They are guaranteed to be within 20 meters of the outlet`);
    console.log(`3. The attendance check-in should succeed with these coordinates\n`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.connection.close();
  }
}

getRouteOutlets();
