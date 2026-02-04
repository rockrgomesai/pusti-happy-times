/**
 * Get categories from database
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function getCategories() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const Category = mongoose.model("Category", new mongoose.Schema({}, { strict: false }), "categories");
    
    const categories = await Category.find({ active: true })
      .select("name category_code product_segment image_url")
      .lean();
    
    console.log(`Total categories: ${categories.length}\n`);
    console.log("Categories:");
    console.log("=".repeat(80));
    
    categories.forEach(c => {
      console.log(`${(c.category_code || 'N/A').padEnd(15)} | ${(c.name || 'N/A').padEnd(30)} | ${(c.product_segment || 'N/A').padEnd(5)} | ${c.image_url || 'NO IMAGE'}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

getCategories();
