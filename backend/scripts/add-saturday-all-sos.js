/**
 * Add Saturday routes for ALL SO users
 * Works for any SO in the system
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function addSaturdayForAllSOs() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");

    const Route = mongoose.model("Route", new mongoose.Schema({}, { strict: false }), "routes");

    // Find all users with SO role
    console.log("🔍 Finding all SO users...\n");
    const role = await mongoose
      .model("roles", new mongoose.Schema({}, { strict: false }))
      .findOne({ role: "SO" });

    if (!role) {
      console.log("❌ SO role not found!");
      return;
    }

    const soUsers = await User.find({ role_id: role._id });
    console.log(`📍 Found ${soUsers.length} SO users:\n`);
    soUsers.forEach((user) => console.log(`  - ${user.username}`));
    console.log();

    if (soUsers.length === 0) {
      console.log("❌ No SO users found!");
      return;
    }

    // Check if routes reference User IDs or Employee IDs
    const sampleRoute = await Route.findOne({
      "sr_assignments.sr_1.sr_id": { $exists: true, $ne: null },
    });

    if (sampleRoute) {
      console.log(`🔍 Sample route structure found\n`);
    }

    // Find all routes (we'll assign random ones to SOs who don't have routes)
    const allRoutes = await Route.find({ active: true }).limit(10);

    if (allRoutes.length === 0) {
      console.log("❌ No routes found in database! Please create routes first.");
      return;
    }

    console.log(`🛣️  Found ${allRoutes.length} available routes\n`);

    let assigned = 0;
    let updated = 0;

    // Work with SO users directly (not employees)
    for (let i = 0; i < soUsers.length; i++) {
      const user = soUsers[i];
      const userId = user._id;

      // Check if this user already has routes
      const existingRoutes = await Route.find({
        $or: [{ "sr_assignments.sr_1.sr_id": userId }, { "sr_assignments.sr_2.sr_id": userId }],
      });

      if (existingRoutes.length > 0) {
        console.log(`  ✅ ${user.username} already has ${existingRoutes.length} route(s)`);

        // Update existing routes to include Saturday
        for (const route of existingRoutes) {
          let modified = false;

          if (route.sr_assignments?.sr_1?.sr_id?.toString() === userId.toString()) {
            if (!route.sr_assignments.sr_1.visit_days.includes("SAT")) {
              route.sr_assignments.sr_1.visit_days.push("SAT");
              modified = true;
            }
          }

          if (route.sr_assignments?.sr_2?.sr_id?.toString() === userId.toString()) {
            if (!route.sr_assignments.sr_2.visit_days.includes("SAT")) {
              route.sr_assignments.sr_2.visit_days.push("SAT");
              modified = true;
            }
          }

          if (modified) {
            await route.save();
            console.log(`    ✅ Added SAT to ${route.route_id}`);
            updated++;
          } else {
            console.log(`    ℹ️  ${route.route_id} already has SAT`);
          }
        }
      } else {
        // Assign a random route with Saturday included
        const routeToAssign = allRoutes[i % allRoutes.length];

        routeToAssign.sr_assignments = {
          sr_1: {
            sr_id: userId,
            visit_days: ["SAT", "MON", "WED"],
          },
          sr_2: routeToAssign.sr_assignments?.sr_2 || { sr_id: null, visit_days: [] },
        };

        await routeToAssign.save();
        console.log(
          `  ✅ Assigned ${routeToAssign.route_id} to ${user.username} with SAT, MON, WED`
        );
        assigned++;
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Saturday routes setup complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Summary:");
    console.log(`  - ${assigned} new route assignments`);
    console.log(`  - ${updated} routes updated with SAT`);
    console.log(`  - ${soUsers.length} SO users processed`);

    console.log("\n✅ Done! SOs can now mark attendance on Saturdays.\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

addSaturdayForAllSOs();
