const mongoose = require("mongoose");

const DepotStockSchema = new mongoose.Schema({}, { strict: false, collection: "depot_stocks" });
const LoadSheetSchema = new mongoose.Schema({}, { strict: false, collection: "load_sheets" });

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("Connected to MongoDB\n");

    const DepotStock = mongoose.model("DepotStock", DepotStockSchema);
    const LoadSheet = mongoose.model("LoadSheet", LoadSheetSchema);

    // Check for the specific product_id
    const productId = new mongoose.Types.ObjectId("68f2855dbdde87d90d1b9e12");
    const targetSKU = "ALO-150G-MGV5SQ9K-QSNY";

    console.log(`Searching for product_id: ${productId}`);
    const stocks = await DepotStock.find({ product_id: productId });
    console.log(`Found ${stocks.length} stock records for this product:`);
    stocks.forEach((s) => {
      console.log(`  Depot: ${s.depot_id}, Qty: ${s.qty_ctn}, Blocked: ${s.blocked_qty}`);
    });

    // Check latest load sheet
    console.log("\n=== Latest Load Sheet ===");
    const latestSheet = await LoadSheet.findOne({}).sort({ created_at: -1 });
    if (latestSheet) {
      console.log(`Load Sheet ID: ${latestSheet._id}`);
      console.log(`Status: ${latestSheet.status}`);
      console.log(`Depot: ${latestSheet.depot_id}`);

      // Check if this SKU is in the load sheet
      let foundSKU = false;
      latestSheet.distributors.forEach((dist) => {
        dist.do_items.forEach((item) => {
          if (item.sku === targetSKU) {
            console.log(`\n✓ Found SKU ${targetSKU} in load sheet`);
            console.log(`  Distributor: ${dist.distributor_name}`);
            console.log(`  Delivery Qty: ${item.delivery_qty}`);
            foundSKU = true;
          }
        });
      });

      if (!foundSKU) {
        console.log(`\n✗ SKU ${targetSKU} NOT found in load sheet`);
      }

      // Check if depot stock exists for this depot + product combination
      console.log(
        `\n=== Checking depot stock for depot ${latestSheet.depot_id} + product ${productId} ===`
      );
      const depotStock = await DepotStock.findOne({
        depot_id: latestSheet.depot_id,
        product_id: productId,
      });

      if (depotStock) {
        console.log("✓ Depot stock record EXISTS");
        console.log(`  Qty: ${depotStock.qty_ctn}, Blocked: ${depotStock.blocked_qty}`);
      } else {
        console.log("✗ Depot stock record DOES NOT EXIST");
        console.log("  This is the problem! Need to create stock record.");
      }
    }

    await mongoose.disconnect();
    console.log("\nDisconnected");
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
