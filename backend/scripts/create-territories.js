/**
 * Create Sample Territory Hierarchy
 * Zone → Region → Area → DB Point
 */

const mongoose = require("mongoose");
const Territory = require("../src/models/Territory");
const User = require("../src/models/User");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function createTerritories() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find superadmin user for created_by/updated_by fields
    const superadmin = await User.findOne({ username: "superadmin" });
    if (!superadmin) {
      console.error("❌ Error: Superadmin user not found. Please ensure a user exists.");
      return;
    }
    const userId = superadmin._id;
    console.log(`✅ Found superadmin: ${superadmin.username} (${userId})`);

    // Sample data
    const territories = [];

    // ZONE 1: DHAKA
    const dhaka = new Territory({
      territory_id: "Z001",
      name: "Dhaka Zone",
      type: "zone",
      level: 0,
      parent_id: null,
      ancestors: [],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await dhaka.save();
    territories.push(dhaka);
    console.log("✅ Created Zone: Dhaka Zone");

    // REGION 1.1: DHAKA NORTH
    const dhakaNorth = new Territory({
      territory_id: "R001",
      name: "Dhaka North Region",
      type: "region",
      level: 1,
      parent_id: dhaka._id,
      ancestors: [dhaka._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await dhakaNorth.save();
    territories.push(dhakaNorth);
    console.log("✅ Created Region: Dhaka North Region");

    // AREA 1.1.1: MIRPUR
    const mirpur = new Territory({
      territory_id: "A001",
      name: "Mirpur Area",
      type: "area",
      level: 2,
      parent_id: dhakaNorth._id,
      ancestors: [dhaka._id, dhakaNorth._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await mirpur.save();
    territories.push(mirpur);
    console.log("✅ Created Area: Mirpur Area");

    // DB POINT 1.1.1.1: MIRPUR-10
    const mirpur10 = new Territory({
      territory_id: "DB001",
      name: "Mirpur-10 DB Point",
      type: "db_point",
      level: 3,
      parent_id: mirpur._id,
      ancestors: [dhaka._id, dhakaNorth._id, mirpur._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await mirpur10.save();
    territories.push(mirpur10);
    console.log("✅ Created DB Point: Mirpur-10 DB Point");

    // DB POINT 1.1.1.2: MIRPUR-12
    const mirpur12 = new Territory({
      territory_id: "DB002",
      name: "Mirpur-12 DB Point",
      type: "db_point",
      level: 3,
      parent_id: mirpur._id,
      ancestors: [dhaka._id, dhakaNorth._id, mirpur._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await mirpur12.save();
    territories.push(mirpur12);
    console.log("✅ Created DB Point: Mirpur-12 DB Point");

    // AREA 1.1.2: UTTARA
    const uttara = new Territory({
      territory_id: "A002",
      name: "Uttara Area",
      type: "area",
      level: 2,
      parent_id: dhakaNorth._id,
      ancestors: [dhaka._id, dhakaNorth._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await uttara.save();
    territories.push(uttara);
    console.log("✅ Created Area: Uttara Area");

    // DB POINT 1.1.2.1: UTTARA SECTOR-3
    const uttaraSector3 = new Territory({
      territory_id: "DB003",
      name: "Uttara Sector-3 DB Point",
      type: "db_point",
      level: 3,
      parent_id: uttara._id,
      ancestors: [dhaka._id, dhakaNorth._id, uttara._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await uttaraSector3.save();
    territories.push(uttaraSector3);
    console.log("✅ Created DB Point: Uttara Sector-3 DB Point");

    // REGION 1.2: DHAKA SOUTH
    const dhakaSouth = new Territory({
      territory_id: "R002",
      name: "Dhaka South Region",
      type: "region",
      level: 1,
      parent_id: dhaka._id,
      ancestors: [dhaka._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await dhakaSouth.save();
    territories.push(dhakaSouth);
    console.log("✅ Created Region: Dhaka South Region");

    // AREA 1.2.1: DHANMONDI
    const dhanmondi = new Territory({
      territory_id: "A003",
      name: "Dhanmondi Area",
      type: "area",
      level: 2,
      parent_id: dhakaSouth._id,
      ancestors: [dhaka._id, dhakaSouth._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await dhanmondi.save();
    territories.push(dhanmondi);
    console.log("✅ Created Area: Dhanmondi Area");

    // DB POINT 1.2.1.1: DHANMONDI-27
    const dhanmondi27 = new Territory({
      territory_id: "DB004",
      name: "Dhanmondi-27 DB Point",
      type: "db_point",
      level: 3,
      parent_id: dhanmondi._id,
      ancestors: [dhaka._id, dhakaSouth._id, dhanmondi._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await dhanmondi27.save();
    territories.push(dhanmondi27);
    console.log("✅ Created DB Point: Dhanmondi-27 DB Point");

    // ZONE 2: CHITTAGONG
    const chittagong = new Territory({
      territory_id: "Z002",
      name: "Chittagong Zone",
      type: "zone",
      level: 0,
      parent_id: null,
      ancestors: [],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await chittagong.save();
    territories.push(chittagong);
    console.log("✅ Created Zone: Chittagong Zone");

    // REGION 2.1: CHITTAGONG METRO
    const ctgMetro = new Territory({
      territory_id: "R003",
      name: "Chittagong Metro Region",
      type: "region",
      level: 1,
      parent_id: chittagong._id,
      ancestors: [chittagong._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await ctgMetro.save();
    territories.push(ctgMetro);
    console.log("✅ Created Region: Chittagong Metro Region");

    // AREA 2.1.1: AGRABAD
    const agrabad = new Territory({
      territory_id: "A004",
      name: "Agrabad Area",
      type: "area",
      level: 2,
      parent_id: ctgMetro._id,
      ancestors: [chittagong._id, ctgMetro._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await agrabad.save();
    territories.push(agrabad);
    console.log("✅ Created Area: Agrabad Area");

    // DB POINT 2.1.1.1: AGRABAD COMMERCIAL
    const agrabadCommercial = new Territory({
      territory_id: "DB005",
      name: "Agrabad Commercial DB Point",
      type: "db_point",
      level: 3,
      parent_id: agrabad._id,
      ancestors: [chittagong._id, ctgMetro._id, agrabad._id],
      active: true,
      created_by: userId,
      updated_by: userId,
    });
    await agrabadCommercial.save();
    territories.push(agrabadCommercial);
    console.log("✅ Created DB Point: Agrabad Commercial DB Point");

    console.log("\n📊 Summary:");
    console.log(`   Total Territories: ${territories.length}`);
    console.log(`   Zones: 2`);
    console.log(`   Regions: 3`);
    console.log(`   Areas: 5`);
    console.log(`   DB Points: 6`);
    console.log("\n✅ Territory hierarchy created successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

createTerritories();
