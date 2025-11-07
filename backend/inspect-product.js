const mongoose = require("mongoose");
require("dotenv").config();

const inspectProduct = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const product = await mongoose.connection.db
      .collection("products")
      .findOne({ sku: "ARO-SMALL-MGV5SQ9I-WWPJ" });

    console.log("📦 Product structure:");
    console.log(JSON.stringify(product, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

inspectProduct();
