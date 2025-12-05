const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("Connected to MongoDB\n");

    const DepotStock = mongoose.model(
      "DepotStock",
      new mongoose.Schema({}, { strict: false, collection: "depot_stocks" })
    );
    const LoadSheet = mongoose.model(
      "LoadSheet",
      new mongoose.Schema({}, { strict: false, collection: "load_sheets" })
    );
    const Product = mongoose.model(
      "Product",
      new mongoose.Schema({}, { strict: false, collection: "products" })
    );

    // Get all load sheets (including locked ones to check their depot_id)
    const loadSheets = await LoadSheet.find({}).sort({ created_at: -1 }).limit(5);
    console.log(`Found ${loadSheets.length} recent load sheets\n`);

    const missingStocks = [];

    for (const sheet of loadSheets) {
      console.log(`Checking Load Sheet ${sheet._id} (Depot: ${sheet.depot_id})`);

      for (const dist of sheet.distributors) {
        for (const item of dist.do_items) {
          const sku = item.sku;

          // Get product
          const product = await Product.findOne({ sku });
          if (!product) {
            console.log(`  ⚠ Product not found for SKU ${sku}`);
            continue;
          }

          // Check if depot stock exists
          const stock = await DepotStock.findOne({
            depot_id: sheet.depot_id,
            product_id: product._id,
          });

          if (!stock) {
            console.log(
              `  ✗ Missing stock record for SKU ${sku} (${product.product_name || "N/A"})`
            );
            missingStocks.push({
              depot_id: sheet.depot_id,
              product_id: product._id,
              sku: sku,
              product_name: product.product_name || "N/A",
            });
          }
        }
      }
    }

    if (missingStocks.length > 0) {
      console.log(`\n=== Creating ${missingStocks.length} missing stock records ===`);

      for (const missing of missingStocks) {
        const newStock = await DepotStock.create({
          depot_id: missing.depot_id,
          product_id: missing.product_id,
          qty_ctn: 0,
          blocked_qty: 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`✓ Created stock record for ${missing.sku} in depot ${missing.depot_id}`);
      }

      console.log("\n✅ All missing stock records created");
      console.log(
        "⚠ WARNING: These stock records have 0 quantity. You need to receive stock first!"
      );
    } else {
      console.log("\n✅ No missing stock records found");
    }

    await mongoose.disconnect();
    console.log("\nDisconnected");
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
