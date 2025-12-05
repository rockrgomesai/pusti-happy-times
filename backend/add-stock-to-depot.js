const mongoose = require("mongoose");

// This script adds stock quantities to a specific depot for testing
// Usage: node add-stock-to-depot.js <depot_id> <quantity>

const depotId = process.argv[2] || "68f2855dbdde87d90d1b9cf2"; // Default to Shabnam depot
const quantity = process.argv[3] || 100;

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("Connected to MongoDB\n");

    const DepotStock = mongoose.model(
      "DepotStock",
      new mongoose.Schema({}, { strict: false, collection: "depot_stocks" })
    );

    // Update all stock records for this depot
    const result = await DepotStock.updateMany(
      { depot_id: new mongoose.Types.ObjectId(depotId) },
      {
        $set: {
          qty_ctn: quantity,
          blocked_qty: 0,
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} stock records for depot ${depotId}`);
    console.log(`Set qty_ctn = ${quantity}, blocked_qty = 0`);

    await mongoose.disconnect();
    console.log("\nDisconnected");
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
