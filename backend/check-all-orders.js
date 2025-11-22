const mongoose = require("mongoose");
require("dotenv").config();

const DemandOrder = require("./src/models/DemandOrder");

async function checkAllOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all orders with their current status
    const allOrders = await DemandOrder.find({}).sort({ createdAt: -1 }).limit(10).lean();

    console.log(`\n📋 Last 10 Orders:\n`);

    allOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order: ${order.order_number}`);
      console.log(`   Distributor ID: ${order.distributor_id || "Unknown"}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Current Approver Role: ${order.current_approver_role || "None"}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(
        `   Last Approval Action: ${order.approval_history?.[order.approval_history.length - 1]?.action || "None"}`
      );
      console.log("");
    });

    // Count by status
    const statusCounts = await DemandOrder.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("\n📊 Orders by Status:");
    statusCounts.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkAllOrders();
