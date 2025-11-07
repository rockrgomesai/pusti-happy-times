const mongoose = require("mongoose");
require("dotenv").config();

const testProductQuery = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const distributorId = new mongoose.Types.ObjectId("68f2855fbdde87d90d1ba252");

    // Get distributor
    const distributor = await mongoose.connection.db
      .collection("distributors")
      .findOne({ _id: distributorId });

    console.log("🏢 Distributor:", distributor.name);
    console.log("   Product segments:", distributor.product_segment);
    console.log();

    // Get categories for distributor segments
    const categories = await mongoose.connection.db
      .collection("categories")
      .find({
        active: true,
        product_segment: { $in: distributor.product_segment },
      })
      .toArray();

    const categoryIds = categories.map((c) => c._id);
    console.log("📁 Categories found:", categoryIds.length);
    console.log();

    // Get products in those categories
    const query = {
      active: true,
      category_id: { $in: categoryIds },
    };

    const products = await mongoose.connection.db
      .collection("products")
      .find(query)
      .limit(10)
      .toArray();

    console.log("📦 Products found:", products.length);
    console.log();

    if (products.length > 0) {
      console.log("📋 Sample products:");
      products.forEach((prod) => {
        const cat = categories.find((c) => c._id.toString() === prod.category_id?.toString());
        console.log(`   - ${prod.sku}: ${prod.short_description || "N/A"}`);
        console.log(`     Category: ${cat?.name} (${cat?.product_segment})`);
      });
    } else {
      console.log("⚠️  No products found!");
      console.log("\nDebugging:");

      // Check if there are ANY products
      const totalProducts = await mongoose.connection.db.collection("products").countDocuments();
      console.log("   Total products in DB:", totalProducts);

      // Check if products have category_id
      const productsWithCategory = await mongoose.connection.db
        .collection("products")
        .countDocuments({
          category_id: { $exists: true, $ne: null },
        });
      console.log("   Products with category_id:", productsWithCategory);

      // Sample a few products to see their structure
      const sampleProducts = await mongoose.connection.db
        .collection("products")
        .find({})
        .limit(3)
        .toArray();

      console.log("\n   Sample product structures:");
      sampleProducts.forEach((p) => {
        console.log(`   - ${p.sku}:`);
        console.log(`     category_id: ${p.category_id || "NOT SET"}`);
        console.log(`     active: ${p.active}`);
      });
    }

    await mongoose.disconnect();
    console.log("\n✅ Done");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

testProductQuery();
