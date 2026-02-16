/**
 * Add Saturday to visit_days for SO1-ABIS and SO2-ABIS routes
 *
 * In Bangladesh, work week is SAT-THU (not SUN-THU)
 * This script updates routes to include Saturday visits
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function addSaturdayRoutes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Employee = mongoose.model(
      "Employee",
      new mongoose.Schema({}, { strict: false }),
      "employees"
    );

    const Route = mongoose.model("Route", new mongoose.Schema({}, { strict: false }), "routes");

    console.log("🔍 Finding SO1-ABIS and SO2-ABIS employees...\n");

    // Find the SO employees
    const so1 = await Employee.findOne({ employee_id: "SO1-ABIS" });
    const so2 = await Employee.findOne({ employee_id: "SO2-ABIS" });

    if (!so1) {
      console.log("❌ SO1-ABIS not found!");
      return;
    }
    if (!so2) {
      console.log("❌ SO2-ABIS not found!");
      return;
    }

    console.log(`📍 Found SO1-ABIS: ${so1.full_name} (${so1._id})`);
    console.log(`📍 Found SO2-ABIS: ${so2.full_name} (${so2._id})\n`);

    // Find routes where these SOs are assigned
    const routes = await Route.find({
      $or: [
        { "sr_assignments.sr_1.sr_id": { $in: [so1._id, so2._id] } },
        { "sr_assignments.sr_2.sr_id": { $in: [so1._id, so2._id] } },
      ],
    });

    console.log(`🛣️  Found ${routes.length} routes assigned to these SOs\n`);

    if (routes.length === 0) {
      console.log("⚠️  No routes found! Creating sample route assignments...\n");

      // Find some routes to assign
      const availableRoutes = await Route.find({ active: true }).limit(4);

      if (availableRoutes.length < 2) {
        console.log("❌ Not enough routes in the database!");
        return;
      }

      // Assign routes to SOs with Saturday
      const route1 = availableRoutes[0];
      const route2 = availableRoutes[1];

      // Update route 1 with SO1-ABIS
      route1.sr_assignments = {
        sr_1: {
          sr_id: so1._id,
          visit_days: ["SAT", "MON", "WED"],
        },
        sr_2: route1.sr_assignments?.sr_2 || { sr_id: null, visit_days: [] },
      };
      await route1.save();
      console.log(`✅ Assigned ${route1.route_id} to SO1-ABIS with visit days: SAT, MON, WED`);

      // Update route 2 with SO2-ABIS
      route2.sr_assignments = {
        sr_1: {
          sr_id: so2._id,
          visit_days: ["SAT", "TUE", "THU"],
        },
        sr_2: route2.sr_assignments?.sr_2 || { sr_id: null, visit_days: [] },
      };
      await route2.save();
      console.log(`✅ Assigned ${route2.route_id} to SO2-ABIS with visit days: SAT, TUE, THU`);

      console.log("\n🎯 Summary:");
      console.log(`  - 2 routes assigned`);
      console.log(`  - Both include Saturday visits`);
    } else {
      // Update existing routes to include Saturday
      let updated = 0;

      for (const route of routes) {
        let modified = false;

        // Check sr_1
        if (
          route.sr_assignments?.sr_1?.sr_id &&
          (route.sr_assignments.sr_1.sr_id.toString() === so1._id.toString() ||
            route.sr_assignments.sr_1.sr_id.toString() === so2._id.toString())
        ) {
          if (!route.sr_assignments.sr_1.visit_days.includes("SAT")) {
            route.sr_assignments.sr_1.visit_days.push("SAT");
            modified = true;
          }
        }

        // Check sr_2
        if (
          route.sr_assignments?.sr_2?.sr_id &&
          (route.sr_assignments.sr_2.sr_id.toString() === so1._id.toString() ||
            route.sr_assignments.sr_2.sr_id.toString() === so2._id.toString())
        ) {
          if (!route.sr_assignments.sr_2.visit_days.includes("SAT")) {
            route.sr_assignments.sr_2.visit_days.push("SAT");
            modified = true;
          }
        }

        if (modified) {
          await route.save();
          const assignedTo =
            route.sr_assignments.sr_1?.sr_id?.toString() === so1._id.toString() ||
            route.sr_assignments.sr_1?.sr_id?.toString() === so2._id.toString()
              ? route.sr_assignments.sr_1
              : route.sr_assignments.sr_2;

          console.log(
            `✅ Updated ${route.route_id}: Added SAT (Days: ${assignedTo.visit_days.join(", ")})`
          );
          updated++;
        }
      }

      console.log("\n🎯 Summary:");
      console.log(`  - ${updated} routes updated with Saturday`);
      console.log(`  - ${routes.length - updated} routes already had Saturday`);
    }

    console.log("\n✅ Done!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

addSaturdayRoutes();
