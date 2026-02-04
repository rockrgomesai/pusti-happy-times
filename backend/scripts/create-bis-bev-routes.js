/**
 * Create Routes for BIS/BEV Distributors
 *
 * Creates:
 * - 24 Routes (2 per distributor × 12 distributors)
 * - Naming pattern: R1-{distributor_id}, R2-{distributor_id}
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function createRoutes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Distributor = mongoose.model(
      "Distributor",
      new mongoose.Schema({}, { strict: false }),
      "distributors"
    );

    const Route = mongoose.model("Route", new mongoose.Schema({}, { strict: false }), "routes");

    console.log("🏗️  Creating Routes for all distributors...\n");

    // Find all BIS/BEV distributors
    const distributors = await Distributor.find({
      distributor_id: /^(DPBIS|DPBEV|DPBISBEV)/,
    }).sort({ distributor_id: 1 });

    console.log(`📦 Found ${distributors.length} distributors\n`);

    let totalCreated = 0;
    let totalExisting = 0;

    for (const distributor of distributors) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Distributor: ${distributor.name} (${distributor.distributor_id})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Create 2 routes for this distributor
      for (let routeNum = 1; routeNum <= 2; routeNum++) {
        const routeName = `R${routeNum}-${distributor.distributor_id}`;
        const routeId = routeName;

        console.log(`  🛣️  Creating Route: ${routeName}`);

        let route = await Route.findOne({ route_id: routeId });
        if (!route) {
          route = await Route.create({
            name: routeName,
            route_id: routeId,
            distributor_id: distributor._id,
            active: true,
            description: `Route ${routeNum} for ${distributor.name}`,
          });
          console.log(`    ✅ Created Route: ${route.name} (${route._id})`);
          totalCreated++;
        } else {
          console.log(`    ℹ️  Route already exists: ${route.name} (${route._id})`);
          totalExisting++;
        }
      }

      console.log(`  ✅ Completed 2 routes for ${distributor.distributor_id}\n`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All routes created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Summary:");
    console.log(`  - ${totalCreated} Routes created`);
    console.log(`  - ${totalExisting} Routes already existed`);
    console.log(`  - ${distributors.length} Distributors processed`);
    console.log(`  - Total routes: ${totalCreated + totalExisting}`);

    console.log("\n🎯 Route Structure (Sample):");
    console.log("\n  BIS Segment:");
    console.log("    DIST-DPBIS1-1 (DPBIS1-D1)");
    console.log("      ├─ R1-DPBIS1-D1");
    console.log("      └─ R2-DPBIS1-D1");
    console.log("    DIST-DPBIS1-2 (DPBIS1-D2)");
    console.log("      ├─ R1-DPBIS1-D2");
    console.log("      └─ R2-DPBIS1-D2");

    console.log("\n  BEV Segment:");
    console.log("    DIST-DPBEV1-1 (DPBEV1-D1)");
    console.log("      ├─ R1-DPBEV1-D1");
    console.log("      └─ R2-DPBEV1-D1");
    console.log("    DIST-DPBEV1-2 (DPBEV1-D2)");
    console.log("      ├─ R1-DPBEV1-D2");
    console.log("      └─ R2-DPBEV1-D2");

    console.log("\n  BIS+BEV Segment:");
    console.log("    DIST-DPBISBEV1-1 (DPBISBEV1-D1)");
    console.log("      ├─ R1-DPBISBEV1-D1");
    console.log("      └─ R2-DPBISBEV1-D1");
    console.log("    DIST-DPBISBEV1-2 (DPBISBEV1-D2)");
    console.log("      ├─ R1-DPBISBEV1-D2");
    console.log("      └─ R2-DPBISBEV1-D2");
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
createRoutes();
