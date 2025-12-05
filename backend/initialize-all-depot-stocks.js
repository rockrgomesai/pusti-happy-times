const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("Connected to MongoDB\n");

    const DepotStock = mongoose.model(
      "DepotStock",
      new mongoose.Schema({}, { strict: false, collection: "depot_stocks" })
    );
    const Product = mongoose.model(
      "Product",
      new mongoose.Schema({}, { strict: false, collection: "products" })
    );
    const Facility = mongoose.model(
      "Facility",
      new mongoose.Schema({}, { strict: false, collection: "facilities" })
    );

    // Get all depots (facilities with type = 'Depot')
    const depots = await Facility.find({ type: "Depot", active: true });
    console.log(`Found ${depots.length} depots\n`);

    // Get all active products
    const products = await Product.find({ active: true });
    console.log(`Found ${products.length} active products\n`);

    let created = 0;
    let skipped = 0;

    for (const depot of depots) {
      console.log(`\nProcessing depot: ${depot.facility_name} (${depot._id})`);

      for (const product of products) {
        // Check if this product is assigned to this depot
        const isAssigned =
          product.facility_ids &&
          product.facility_ids.some((fid) => fid.toString() === depot._id.toString());

        if (!isAssigned) {
          continue; // Skip products not assigned to this depot
        }

        // Check if stock record exists
        const existingStock = await DepotStock.findOne({
          depot_id: depot._id,
          product_id: product._id,
        });

        if (existingStock) {
          skipped++;
        } else {
          // Create new stock record
          await DepotStock.create({
            depot_id: depot._id,
            product_id: product._id,
            qty_ctn: 0,
            blocked_qty: 0,
            created_at: new Date(),
            updated_at: new Date(),
          });
          console.log(`  ✓ Created stock for ${product.sku}`);
          created++;
        }
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Created: ${created} stock records`);
    console.log(`Skipped: ${skipped} existing records`);

    if (created > 0) {
      console.log(
        "\n⚠ WARNING: New stock records have 0 quantity. Receive stock to update quantities!"
      );
    }

    await mongoose.disconnect();
    console.log("\nDisconnected");
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
