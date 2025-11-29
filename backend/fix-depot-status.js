/**
 * Fix depot status for received offer
 */

const mongoose = require("mongoose");
const OfferSend = require("./src/models/OfferSend");
const OfferReceive = require("./src/models/OfferReceive");
const Facility = require("./src/models/Facility");
const Product = require("./src/models/Product");

const MONGODB_URI =
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixDepotStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find the receive record
    const receive = await OfferReceive.findOne({ ref_no: "OFFRECV-20251129-001" });
    if (!receive) {
      console.log("❌ Receive record not found");
      process.exit(1);
    }

    console.log("✅ Found receive record:", receive._id);
    console.log("   Depot ID:", receive.depot_id);
    console.log("   Offer Send ID:", receive.offer_send_id);
    console.log("   Received By:", receive.received_by);

    // Find the send record
    const send = await OfferSend.findById(receive.offer_send_id);
    if (!send) {
      console.log("❌ Send record not found");
      process.exit(1);
    }

    console.log("✅ Found send record:", send.ref_no);

    // Update depot status
    const depotStatusIndex = send.depot_status.findIndex(
      (ds) => ds.depot_id.toString() === receive.depot_id.toString()
    );

    if (depotStatusIndex === -1) {
      console.log("❌ Depot not found in send depot_status array");
      process.exit(1);
    }

    console.log("\n📋 Current depot status:", send.depot_status[depotStatusIndex].status);

    send.depot_status[depotStatusIndex].status = "received";
    send.depot_status[depotStatusIndex].received_by = receive.received_by;
    send.depot_status[depotStatusIndex].received_at = receive.receive_date;
    send.depot_status[depotStatusIndex].note = receive.general_note || "";

    // Update overall status
    const allReceived = send.depot_status.every((ds) => ds.status === "received");
    if (allReceived) {
      send.status = "fully_received";
    } else {
      send.status = "partially_received";
    }

    await send.save();
    console.log("✅ Updated depot status to: received");
    console.log("✅ Updated overall status to:", send.status);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixDepotStatus();
