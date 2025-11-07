/**
 * Check recent shipments
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkShipments() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Get recent shipments
    const shipments = await db
      .collection("production_send_to_stores")
      .find({})
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    console.log(`📦 Recent shipments (${shipments.length}):\n`);

    if (shipments.length === 0) {
      console.log("   No shipments found");
    } else {
      shipments.forEach((s) => {
        console.log(`   ${s.ref}`);
        console.log(`     Status: ${s.status}`);
        console.log(`     To Depot: ${s.facility_store_id}`);
        console.log(`     Created: ${s.created_at}`);
        console.log(`     Products: ${s.details?.length || 0}`);
        console.log("");
      });
    }

    // Get depot info
    const depot = await db.collection("facilities").findOne({
      _id: new mongoose.Types.ObjectId("68f2855dbdde87d90d1b9cf2"),
    });

    if (depot) {
      console.log(`📍 Shabnam's Depot: ${depot.name}`);
      console.log(`   Type: ${depot.type}`);
      console.log(`   ID: ${depot._id}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkShipments();
