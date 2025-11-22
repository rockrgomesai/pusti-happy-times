const mongoose = require("mongoose");
require("dotenv").config();

const DemandOrder = require("./src/models/DemandOrder");

async function fixStuckOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find orders that are forwarded_to_rsm (stuck with RSM)
    const stuckOrders = await DemandOrder.find({
      status: "forwarded_to_rsm",
    })
      .populate("distributor_id", "name")
      .lean();

    console.log(`\n📋 Found ${stuckOrders.length} orders with status 'forwarded_to_rsm':\n`);

    stuckOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order: ${order.order_number}`);
      console.log(`   Distributor: ${order.distributor_id?.name || "Unknown"}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Current Approver Role: ${order.current_approver_role || "None"}`);
      console.log(`   Total Amount: ৳${order.total_amount?.toFixed(2) || "0.00"}`);
      console.log("");
    });

    console.log("\n✅ Orders are currently with RSM for approval.");
    console.log("💡 RSM users can now retry forwarding to Sales Admin.");

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixStuckOrders();
