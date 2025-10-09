const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const { Product } = require("../src/models");

(async () => {
  try {
    await connectDB();
    const count = await Product.countDocuments();
    console.log(`Found ${count} products`);
    const products = await Product.find({}, { sku: 1, product_type: 1, name: 1 }).lean();
    console.log(products);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
})();
