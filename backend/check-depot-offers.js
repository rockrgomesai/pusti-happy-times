/**
 * Check offer sends for Dhaka Central Depot
 */

const mongoose = require("mongoose");
const OfferSend = require("./src/models/OfferSend");
const OfferReceive = require("./src/models/OfferReceive");
const Facility = require("./src/models/Facility");

const MONGODB_URI =
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkOffers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Dhaka Central Depot
    const depot = await Facility.findOne({ name: "Dhaka Central Depot" });
    if (!depot) {
      console.log("❌ Dhaka Central Depot not found");
      process.exit(1);
    }
    console.log("✅ Found depot:", depot._id);

    // Find all offer sends for this depot
    const sends = await OfferSend.find({
      depot_ids: depot._id,
      is_deleted: false,
    }).select("ref_no send_date status depot_status");

    console.log(`\n📊 Total offer sends for this depot: ${sends.length}`);

    sends.forEach((send, index) => {
      console.log(`\n${index + 1}. ${send.ref_no}`);
      console.log(`   Send Date: ${send.send_date?.toISOString().split("T")[0]}`);
      console.log(`   Overall Status: ${send.status}`);

      const depotStatus = send.depot_status.find(
        (ds) => ds.depot_id.toString() === depot._id.toString()
      );

      if (depotStatus) {
        console.log(`   Depot Status: ${depotStatus.status}`);
        console.log(`   Received At: ${depotStatus.received_at || "Not received"}`);
      }
    });

    // Check receive records
    const receives = await OfferReceive.find({
      depot_id: depot._id,
    }).select("ref_no receive_date offer_send_ref_no");

    console.log(`\n\n📊 Receive records for this depot: ${receives.length}`);
    receives.forEach((receive, index) => {
      console.log(
        `${index + 1}. ${receive.ref_no} - Send: ${receive.offer_send_ref_no} - Date: ${receive.receive_date?.toISOString().split("T")[0]}`
      );
    });

    // Find pending sends
    console.log("\n\n🔍 Checking for pending sends...");
    const pending = await OfferSend.find({
      depot_ids: depot._id,
      "depot_status.depot_id": depot._id,
      "depot_status.status": "pending",
      is_deleted: false,
    });

    console.log(`📊 Pending sends: ${pending.length}`);
    pending.forEach((send) => {
      console.log(`   - ${send.ref_no}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkOffers();
