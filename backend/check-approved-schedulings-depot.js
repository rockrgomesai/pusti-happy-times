/**
 * Check which depot the approved schedulings belong to
 * Compare with Narsingdi Depot
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkApprovedSchedulings() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Get Narsingdi Depot
    const narsingdiDepot = await db.collection("facilities").findOne({
      name: /Narsingdi/i,
    });

    console.log("=== NARSINGDI DEPOT ===");
    console.log(`ID: ${narsingdiDepot._id}`);
    console.log(`Name: ${narsingdiDepot.name}\n`);

    // Find all approved schedulings
    const approvedSchedulings = await db
      .collection("schedulings")
      .find({ current_status: "Approved" })
      .limit(10)
      .toArray();

    console.log(`=== APPROVED SCHEDULINGS (${approvedSchedulings.length} found) ===\n`);

    for (const sched of approvedSchedulings) {
      // Get order details
      const order = await db.collection("demandorders").findOne({ _id: sched.order_id });

      // Get depot details
      const depot = await db.collection("facilities").findOne({ _id: sched.depot_id });

      // Get distributor details
      const distributor = await db
        .collection("distributors")
        .findOne({ _id: sched.distributor_id });

      console.log(`Scheduling: ${order?.order_number || sched._id}`);
      console.log(`  Depot ID: ${sched.depot_id}`);
      console.log(`  Depot Name: ${depot?.name || "NOT FOUND"}`);
      console.log(`  Distributor: ${distributor?.name || "NOT FOUND"}`);
      console.log(`  Status: ${sched.current_status}`);
      console.log(`  Items: ${sched.scheduling_details?.length || 0}`);

      if (sched.depot_id.toString() === narsingdiDepot._id.toString()) {
        console.log(`  ✅ MATCHES Narsingdi Depot`);
      } else {
        console.log(`  ❌ Different depot (not Narsingdi)`);
      }
      console.log();
    }

    // Check if user 103 can see these
    console.log("=== USER 103 ACCESS ===");
    const user103 = await db.collection("users").findOne({ username: "103" });
    const employee = await db.collection("employees").findOne({ _id: user103.employee_id });

    console.log(`User 103's Depot ID: ${employee.facility_id}`);
    console.log(`Narsingdi Depot ID: ${narsingdiDepot._id}`);
    console.log(
      `Match: ${employee.facility_id.toString() === narsingdiDepot._id.toString() ? "✅ YES" : "❌ NO"}\n`
    );

    // Show which depot has the approved schedulings
    const depotIds = [...new Set(approvedSchedulings.map((s) => s.depot_id.toString()))];

    console.log("=== DEPOTS WITH APPROVED SCHEDULINGS ===");
    for (const depotId of depotIds) {
      const depot = await db.collection("facilities").findOne({
        _id: new mongoose.Types.ObjectId(depotId),
      });
      const count = approvedSchedulings.filter((s) => s.depot_id.toString() === depotId).length;
      console.log(`${depot?.name || depotId}: ${count} approved scheduling(s)`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkApprovedSchedulings();
