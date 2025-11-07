/**
 * Check depot stocks data
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkDepotStocks() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Get shabnamdpo's depot
    const user = await db.collection("users").findOne({ username: "shabnamdpo" });
    const employee = await db.collection("employees").findOne({ _id: user.employee_id });
    const depotId = employee.facility_id;

    console.log("📍 Depot ID:", depotId);
    console.log(`   Employee: ${employee.name}\n`);

    // Check depot_stocks
    const stocks = await db.collection("depot_stocks").find({ depot_id: depotId }).toArray();

    console.log(`📦 Depot Stocks (${stocks.length} products):\n`);

    if (stocks.length === 0) {
      console.log("   ❌ No stock records found!\n");
    } else {
      for (const stock of stocks.slice(0, 5)) {
        const product = await db.collection("products").findOne({ _id: stock.product_id });
        console.log(`   Product: ${product?.sku || "Unknown"}`);
        console.log(`     Qty: ${stock.qty_ctn}`);
        console.log(`     Type: ${typeof stock.qty_ctn}`);
        console.log(`     Raw value: ${JSON.stringify(stock.qty_ctn)}`);
        console.log("");
      }
    }

    // Check depot_transactions_in
    const transactionsIn = await db
      .collection("depot_transactions_in")
      .find({ depot_id: depotId })
      .toArray();

    console.log(`📥 Incoming Transactions (${transactionsIn.length}):\n`);

    if (transactionsIn.length === 0) {
      console.log("   ❌ No incoming transactions found!\n");
    } else {
      for (const txn of transactionsIn.slice(0, 5)) {
        const product = await db.collection("products").findOne({ _id: txn.product_id });
        console.log(`   ${txn.batch_no}`);
        console.log(`     Product: ${product?.sku || "Unknown"}`);
        console.log(`     Qty: ${txn.qty_ctn}`);
        console.log(`     Type: ${typeof txn.qty_ctn}`);
        console.log(`     Status: ${txn.status}`);
        console.log(`     Date: ${txn.transaction_date}`);
        console.log("");
      }
    }

    // Check received shipments
    const shipments = await db
      .collection("production_send_to_stores")
      .find({
        facility_store_id: depotId,
        status: "received",
      })
      .toArray();

    console.log(`📬 Received Shipments (${shipments.length}):\n`);

    if (shipments.length === 0) {
      console.log("   ❌ No received shipments found!");
      console.log("   Tip: Create a shipment with shabnamprod and receive it with shabnamdpo\n");
    } else {
      shipments.forEach((s) => {
        console.log(`   ${s.ref} - Received: ${s.received_at}`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDepotStocks();
