const mongoose = require("mongoose");
require("dotenv").config();

const Scheduling = require("./src/models/Scheduling");
const Facility = require("./src/models/Facility");

async function testSchedulingQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Test Distribution query (should see all non-rejected)
    console.log("\n📦 Testing Distribution Query:");
    const distributionQuery = { current_status: { $ne: "Rejected" } };
    const distributionSchedulings = await Scheduling.find(distributionQuery)
      .populate("scheduling_details.depot_id", "name")
      .lean();

    console.log(`Found ${distributionSchedulings.length} schedulings for Distribution`);
    distributionSchedulings.forEach((s) => {
      console.log(
        `  - ${s.order_number}: Status=${s.current_status}, Details=${s.scheduling_details?.length || 0}`
      );
      if (s.scheduling_details && s.scheduling_details.length > 0) {
        s.scheduling_details.forEach((d, idx) => {
          console.log(
            `    ${idx + 1}. ${d.sku}: Qty=${d.delivery_qty}, Depot=${d.depot_id?.name || "N/A"}, Status=${d.approval_status || "N/A"}`
          );
        });
      }
    });

    // Test Finance query
    console.log("\n💰 Testing Finance Query:");
    const financeQuery = { current_status: "Finance-to-approve" };
    const financeSchedulings = await Scheduling.find(financeQuery)
      .populate("scheduling_details.depot_id", "name")
      .lean();

    console.log(`Found ${financeSchedulings.length} schedulings for Finance`);
    financeSchedulings.forEach((s) => {
      console.log(
        `  - ${s.order_number}: Status=${s.current_status}, Details=${s.scheduling_details?.length || 0}`
      );
    });

    await mongoose.connection.close();
    console.log("\n✅ Test completed");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testSchedulingQuery();
