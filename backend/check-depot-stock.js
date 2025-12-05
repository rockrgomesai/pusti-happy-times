require("dotenv").config();
const mongoose = require("mongoose");

async function checkStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const DepotStock = mongoose.model(
      "DepotStock",
      new mongoose.Schema({}, { strict: false }),
      "depot_stocks"
    );

    const depotId = "68f2855dbdde87d90d1b9cf1";
    const stocks = await DepotStock.find({ depot_id: depotId });

    console.log("=== DHAKA CENTRAL DEPOT STOCK ===\n");
    console.log(`Total Records: ${stocks.length}\n`);

    let totalQty = 0;
    stocks.forEach((stock) => {
      const qty = parseFloat(stock.qty_ctn.toString());
      console.log(`Product: ${stock.product_id}`);
      console.log(`  Quantity: ${qty} units`);
      console.log("");
      totalQty += qty;
    });

    console.log(`=== SUMMARY ===`);
    console.log(`Total Items: ${stocks.length}`);
    console.log(`Total Quantity: ${totalQty} units`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkStock();
