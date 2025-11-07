/**
 * Test the getStockSummary aggregation
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function testAggregation() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const DepotStock = require("../src/models/DepotStock");

    // Get shabnamdpo's depot
    const db = mongoose.connection.db;
    const user = await db.collection("users").findOne({ username: "shabnamdpo" });
    const employee = await db.collection("employees").findOne({ _id: user.employee_id });
    const depotId = employee.facility_id;

    console.log("📍 Testing getStockSummary for depot:", depotId);
    console.log("");

    const summary = await DepotStock.getStockSummary(depotId);

    console.log(`📊 Summary returned ${summary.length} products:\n`);

    summary.slice(0, 3).forEach((item) => {
      console.log(`Product: ${item.sku}`);
      console.log(`  total_qty_ctn: ${item.total_qty_ctn} (type: ${typeof item.total_qty_ctn})`);
      console.log(`  total_qty_pcs: ${item.total_qty_pcs} (type: ${typeof item.total_qty_pcs})`);
      console.log(`  total_wt_mt: ${item.total_wt_mt} (type: ${typeof item.total_wt_mt})`);
      console.log(`  batch_count: ${item.batch_count}`);
      console.log(`  earliest_expiry_date: ${item.earliest_expiry_date}`);
      console.log("");
    });

    console.log("\n✅ Test complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testAggregation();
