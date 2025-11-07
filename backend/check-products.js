const mongoose = require("mongoose");
require("dotenv").config();

const checkProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check total products
    const totalProducts = await mongoose.connection.db.collection("products").countDocuments();
    console.log("📦 Total products in database:", totalProducts);

    // Check active products
    const activeProducts = await mongoose.connection.db
      .collection("products")
      .countDocuments({ active: true });
    console.log("✅ Active products:", activeProducts);

    // Check product_segment field
    const productsWithSegment = await mongoose.connection.db.collection("products").countDocuments({
      product_segment: { $exists: true, $ne: null },
    });
    console.log("🏷️  Products with product_segment field:", productsWithSegment);

    // Check segment distribution
    const bisProducts = await mongoose.connection.db
      .collection("products")
      .countDocuments({ product_segment: "BIS" });
    const bevProducts = await mongoose.connection.db
      .collection("products")
      .countDocuments({ product_segment: "BEV" });
    console.log("   - BIS products:", bisProducts);
    console.log("   - BEV products:", bevProducts);

    // Sample products
    const sampleProducts = await mongoose.connection.db
      .collection("products")
      .find({})
      .limit(5)
      .toArray();

    console.log("\n📋 Sample products:");
    sampleProducts.forEach((prod) => {
      console.log(`   - SKU: ${prod.sku}`);
      console.log(`     product_segment: ${prod.product_segment || "NOT SET"}`);
      console.log(`     active: ${prod.active}`);
      console.log(`     category: ${prod.category}`);
      console.log();
    });

    await mongoose.disconnect();
    console.log("✅ Done");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

checkProducts();
