const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("Connected to MongoDB\n");

    const Product = mongoose.model(
      "Product",
      new mongoose.Schema({}, { strict: false, collection: "products" })
    );
    const DepotStock = mongoose.model(
      "DepotStock",
      new mongoose.Schema({}, { strict: false, collection: "depot_stocks" })
    );

    const depotId = "68f2855dbdde87d90d1b9cf1";
    const sku = "ALO-75G-MGV5SQ9K-JG63";
    const productId = "68f2855dbdde87d90d1b9e11";

    console.log(`Checking SKU: ${sku}`);
    console.log(`Product ID: ${productId}`);
    console.log(`Depot ID: ${depotId}\n`);

    // Check if product exists
    const product = await Product.findById(productId);
    if (product) {
      console.log(`✓ Product exists: ${product.sku}`);
    } else {
      console.log(`✗ Product NOT found`);
    }

    // Check if stock record exists
    const stock = await DepotStock.findOne({
      depot_id: new mongoose.Types.ObjectId(depotId),
      product_id: new mongoose.Types.ObjectId(productId),
    });

    if (stock) {
      console.log(`✓ Stock record exists`);
      console.log(`  Qty: ${stock.qty_ctn}, Blocked: ${stock.blocked_qty}`);
    } else {
      console.log(`✗ Stock record DOES NOT EXIST`);
      console.log(`\nCreating stock record...`);

      const newStock = await DepotStock.create({
        depot_id: new mongoose.Types.ObjectId(depotId),
        product_id: new mongoose.Types.ObjectId(productId),
        qty_ctn: 100,
        blocked_qty: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log(`✓ Stock record created with ID: ${newStock._id}`);
      console.log(`  Qty: ${newStock.qty_ctn}, Blocked: ${newStock.blocked_qty}`);
    }

    await mongoose.disconnect();
    console.log("\nDisconnected");
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
