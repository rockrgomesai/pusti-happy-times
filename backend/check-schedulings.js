const mongoose = require("mongoose");
const Scheduling = require("./src/models/Scheduling");
const Distributor = require("./src/models/Distributor");
const Facility = require("./src/models/Facility");
const DemandOrder = require("./src/models/DemandOrder");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkSchedulings() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const schedulings = await Scheduling.find()
      .populate("distributor_id", "name")
      .populate("depot_id", "name")
      .populate("order_id", "order_number status current_approver_role")
      .lean();

    console.log("\n📦 SCHEDULING RECORDS:");
    console.log("Total:", schedulings.length);
    console.log("=".repeat(80));

    schedulings.forEach((s, idx) => {
      console.log(`\n${idx + 1}. Scheduling ID: ${s._id}`);
      console.log(`   Order Number: ${s.order_number}`);
      console.log(`   Distributor: ${s.distributor_id?.name || "N/A"}`);
      console.log(`   Depot: ${s.depot_id?.name || "N/A"}`);
      console.log(`   Current Status: ${s.current_status}`);
      console.log(`   Created: ${s.created_at}`);

      if (s.order_id) {
        console.log(`   Order Status: ${s.order_id.status}`);
        console.log(`   Order Current Approver: ${s.order_id.current_approver_role}`);
      }

      // Show item summary
      const totalItems = s.items.length;
      const totalUnscheduled = s.items.reduce((sum, item) => sum + (item.unscheduled_qty || 0), 0);
      console.log(`   Items: ${totalItems}, Total Unscheduled Qty: ${totalUnscheduled}`);
    });

    console.log("\n" + "=".repeat(80));

    await mongoose.connection.close();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkSchedulings();
