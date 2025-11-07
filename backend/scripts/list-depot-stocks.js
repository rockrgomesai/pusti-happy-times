/**
 * List all depot stocks
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function listStocks() {
  try {
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection.db;

    // Group by depot
    const byDepot = await db
      .collection("depot_stocks")
      .aggregate([{ $group: { _id: "$depot_id", count: { $sum: 1 } } }])
      .toArray();

    console.log("Stocks by depot:");
    for (const d of byDepot) {
      const depot = await db.collection("facilities").findOne({ _id: d._id });
      console.log(`  ${depot?.name || d._id}: ${d.count} products`);
    }
    console.log("");

    const depotId = new mongoose.Types.ObjectId("68f2855dbdde87d90d1b9cf2");

    const stocks = await db.collection("depot_stocks").find({ depot_id: depotId }).toArray();

    console.log(`\nShabnam depot stocks: ${stocks.length}\n`);

    for (const s of stocks) {
      const product = await db.collection("products").findOne({ _id: s.product_id });
      const qty = s.qty_ctn.$numberDecimal || s.qty_ctn;
      console.log(`${product.sku}: ${qty} cartons`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listStocks();
