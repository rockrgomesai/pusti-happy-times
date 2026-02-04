/**
 * Create BIS/BEV Territory and Distributor Structure
 *
 * Creates:
 * - ZBIS → RBIS → ABIS → DB-ABIS → DBIS
 * - ZBEV → RBEV → ABEV → DB-ABEV → DBEV
 * - ZBISBEV → RBISBEV → ABISBEV → DB-ABISBEV → DBISBEV
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function createBISBEVStructure() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Territory = mongoose.model(
      "Territory",
      new mongoose.Schema({}, { strict: false }),
      "territories"
    );

    const Distributor = mongoose.model(
      "Distributor",
      new mongoose.Schema({}, { strict: false }),
      "distributors"
    );

    // Define the structure
    const structures = [
      {
        zone: { name: "ZBIS", code: "ZBIS" },
        region: { name: "RBIS", code: "RBIS" },
        area: { name: "ABIS", code: "ABIS" },
        dbPoint: { name: "DB-ABIS", code: "DB-ABIS" },
        distributor: { name: "DBIS", distributor_id: "DBIS" },
      },
      {
        zone: { name: "ZBEV", code: "ZBEV" },
        region: { name: "RBEV", code: "RBEV" },
        area: { name: "ABEV", code: "ABEV" },
        dbPoint: { name: "DB-ABEV", code: "DB-ABEV" },
        distributor: { name: "DBEV", distributor_id: "DBEV" },
      },
      {
        zone: { name: "ZBISBEV", code: "ZBISBEV" },
        region: { name: "RBISBEV", code: "RBISBEV" },
        area: { name: "ABISBEV", code: "ABISBEV" },
        dbPoint: { name: "DB-ABISBEV", code: "DB-ABISBEV" },
        distributor: { name: "DBISBEV", distributor_id: "DBISBEV" },
      },
    ];

    console.log("🏗️  Creating Territory and Distributor Structure...\n");

    for (const struct of structures) {
      console.log(`\n📍 Creating structure for ${struct.zone.name}...`);

      // 1. Create Zone
      let zone = await Territory.findOne({ name: struct.zone.name, type: "zone" });
      if (!zone) {
        zone = await Territory.create({
          name: struct.zone.name,
          territory_id: struct.zone.code,
          type: "zone",
          level: 1,
          parent_id: null,
          active: true,
        });
        console.log(`  ✅ Created Zone: ${zone.name} (${zone._id})`);
      } else {
        console.log(`  ℹ️  Zone already exists: ${zone.name} (${zone._id})`);
      }

      // 2. Create Region
      let region = await Territory.findOne({ name: struct.region.name, type: "region" });
      if (!region) {
        region = await Territory.create({
          name: struct.region.name,
          territory_id: struct.region.code,
          type: "region",
          level: 2,
          parent_id: zone._id,
          active: true,
        });
        console.log(`  ✅ Created Region: ${region.name} (${region._id})`);
      } else {
        console.log(`  ℹ️  Region already exists: ${region.name} (${region._id})`);
      }

      // 3. Create Area
      let area = await Territory.findOne({ name: struct.area.name, type: "area" });
      if (!area) {
        area = await Territory.create({
          name: struct.area.name,
          territory_id: struct.area.code,
          type: "area",
          level: 3,
          parent_id: region._id,
          active: true,
        });
        console.log(`  ✅ Created Area: ${area.name} (${area._id})`);
      } else {
        console.log(`  ℹ️  Area already exists: ${area.name} (${area._id})`);
      }

      // 4. Create DB Point
      let dbPoint = await Territory.findOne({ name: struct.dbPoint.name, type: "db_point" });
      if (!dbPoint) {
        dbPoint = await Territory.create({
          name: struct.dbPoint.name,
          territory_id: struct.dbPoint.code,
          type: "db_point",
          level: 4,
          parent_id: area._id,
          active: true,
        });
        console.log(`  ✅ Created DB Point: ${dbPoint.name} (${dbPoint._id})`);
      } else {
        console.log(`  ℹ️  DB Point already exists: ${dbPoint.name} (${dbPoint._id})`);
      }

      // 5. Create Distributor
      let distributor = await Distributor.findOne({
        distributor_id: struct.distributor.distributor_id,
      });
      if (!distributor) {
        distributor = await Distributor.create({
          name: struct.distributor.name,
          distributor_id: struct.distributor.distributor_id,
          db_point_id: dbPoint._id,
          active: true,
          contact_person: "N/A",
          phone: "N/A",
          email: `${struct.distributor.distributor_id.toLowerCase()}@example.com`,
          address: `${struct.area.name} Territory`,
        });
        console.log(`  ✅ Created Distributor: ${distributor.name} (${distributor._id})`);
      } else {
        console.log(`  ℹ️  Distributor already exists: ${distributor.name} (${distributor._id})`);
      }

      console.log(
        `  ✨ Structure complete: ${struct.zone.name} → ${struct.region.name} → ${struct.area.name} → ${struct.dbPoint.name} → ${struct.distributor.name}`
      );
    }

    console.log("\n\n✅ All structures created successfully!");
    console.log("\n📊 Summary:");
    console.log("  - 3 Zones created/verified");
    console.log("  - 3 Regions created/verified");
    console.log("  - 3 Areas created/verified");
    console.log("  - 3 DB Points created/verified");
    console.log("  - 3 Distributors created/verified");

    console.log("\n🎯 Territory Hierarchy:");
    console.log("  ZBIS → RBIS → ABIS → DB-ABIS → DBIS");
    console.log("  ZBEV → RBEV → ABEV → DB-ABEV → DBEV");
    console.log("  ZBISBEV → RBISBEV → ABISBEV → DB-ABISBEV → DBISBEV");
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
createBISBEVStructure();
