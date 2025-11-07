const mongoose = require("mongoose");
require("dotenv").config();

const checkDistbanana = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find distbanana user
    const user = await mongoose.connection.db
      .collection("users")
      .findOne({ username: "distbanana" });
    console.log("👤 User distbanana:");
    console.log("   - _id:", user?._id);
    console.log("   - username:", user?.username);
    console.log("   - distributor_id:", user?.distributor_id);
    console.log();

    // Find distributor
    if (user?.distributor_id) {
      const distributor = await mongoose.connection.db
        .collection("distributors")
        .findOne({ _id: user.distributor_id });
      console.log("🏢 Distributor:");
      console.log("   - _id:", distributor?._id);
      console.log("   - name:", distributor?.name);
      console.log("   - product_segment:", distributor?.product_segment);
      console.log("   - skus_exclude:", distributor?.skus_exclude?.length || 0, "SKUs");
      console.log("   - delivery_depot_id:", distributor?.delivery_depot_id);
      console.log();

      // Count categories
      const categoryCount = await mongoose.connection.db.collection("categories").countDocuments({
        active: true,
        product_segment: { $in: distributor.product_segment },
      });
      console.log("📁 Categories available:", categoryCount);

      // List some categories
      const categories = await mongoose.connection.db
        .collection("categories")
        .find({
          active: true,
          product_segment: { $in: distributor.product_segment },
        })
        .limit(10)
        .toArray();

      console.log("\n📋 Sample categories:");
      categories.forEach((cat) => {
        console.log(
          `   - ${cat.name} (${cat.product_segment}) ${cat.parent_id ? "(child)" : "(root)"}`
        );
      });
      console.log();

      // Count products
      const query = {
        active: true,
        product_segment: { $in: distributor.product_segment },
      };

      if (distributor.skus_exclude && distributor.skus_exclude.length > 0) {
        query._id = { $nin: distributor.skus_exclude };
      }

      const productCount = await mongoose.connection.db
        .collection("products")
        .countDocuments(query);
      console.log("📦 Products available:", productCount);

      // List some products
      const products = await mongoose.connection.db
        .collection("products")
        .find(query)
        .limit(5)
        .toArray();

      console.log("\n🛍️ Sample products:");
      products.forEach((prod) => {
        console.log(`   - ${prod.sku}: ${prod.short_description} (${prod.product_segment})`);
      });
    }

    await mongoose.disconnect();
    console.log("\n✅ Done");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

checkDistbanana();
