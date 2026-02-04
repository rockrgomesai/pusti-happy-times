/**
 * Generate and assign placeholder images for product categories
 * Creates SVG placeholder images for testing mobile app
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";
const IMAGE_DIR = path.join(__dirname, "../public/images/categories");

// Ensure directory exists
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

/**
 * Generate SVG placeholder image for a category
 */
function generateCategoryImage(categoryName, productSegment, filename) {
  // Color scheme based on segment
  const colors = {
    BIS: { bg: "#FFE5B4", text: "#8B4513", border: "#D2691E" }, // Warm biscuit colors
    BEV: { bg: "#E0F2FF", text: "#0066CC", border: "#4A90E2" }  // Cool beverage colors
  };
  
  const color = colors[productSegment] || colors.BIS;
  
  // Create SVG with category name
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${productSegment}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color.border};stop-opacity:0.3" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="400" height="400" fill="url(#grad${productSegment})"/>
  
  <!-- Border -->
  <rect x="10" y="10" width="380" height="380" 
        fill="none" stroke="${color.border}" stroke-width="4" rx="20"/>
  
  <!-- Product Segment Badge -->
  <rect x="30" y="30" width="80" height="40" fill="${color.border}" rx="8"/>
  <text x="70" y="55" font-family="Arial, sans-serif" font-size="20" 
        font-weight="bold" fill="white" text-anchor="middle">${productSegment}</text>
  
  <!-- Category Icon (Simple geometric shape based on category) -->
  <circle cx="200" cy="160" r="60" fill="${color.border}" opacity="0.3"/>
  <circle cx="200" cy="160" r="40" fill="${color.border}" opacity="0.5"/>
  
  <!-- Category Name -->
  <text x="200" y="280" font-family="Arial, sans-serif" font-size="28" 
        font-weight="bold" fill="${color.text}" text-anchor="middle">${categoryName}</text>
  
  <!-- Decorative element -->
  <line x1="50" y1="310" x2="350" y2="310" stroke="${color.border}" 
        stroke-width="2" opacity="0.5"/>
  
  <!-- Placeholder text -->
  <text x="200" y="350" font-family="Arial, sans-serif" font-size="16" 
        fill="${color.text}" text-anchor="middle" opacity="0.6">Product Category</text>
</svg>`;

  const filepath = path.join(IMAGE_DIR, filename);
  fs.writeFileSync(filepath, svg, 'utf8');
  
  return `/images/categories/${filename}`;
}

async function assignCategoryImages() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Category = mongoose.model("Category", new mongoose.Schema({}, { strict: false }), "categories");
    const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }), "products");

    // Get all active categories without images
    const categories = await Category.find({ active: true }).lean();
    
    console.log(`📦 Found ${categories.length} categories\n`);
    console.log("🎨 Generating SVG placeholder images...\n");

    let updatedCount = 0;
    let productsUpdated = 0;

    for (const category of categories) {
      // Skip if already has image
      if (category.image_url) {
        console.log(`⏭️  ${category.name} - already has image`);
        continue;
      }

      // Generate filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const filename = `category-${timestamp}-${random}.svg`;

      // Generate SVG image
      const imageUrl = generateCategoryImage(
        category.name.substring(0, 25), // Limit length for display
        category.product_segment,
        filename
      );

      // Update category
      await Category.updateOne(
        { _id: category._id },
        { $set: { image_url: imageUrl } }
      );

      // Update all products in this category to use the same image
      const result = await Product.updateMany(
        { 
          category_id: category._id,
          $or: [
            { image_url: { $exists: false } },
            { image_url: null },
            { image_url: "" }
          ]
        },
        { $set: { image_url: imageUrl } }
      );

      updatedCount++;
      productsUpdated += result.modifiedCount;

      console.log(`✅ ${category.name.padEnd(30)} | ${category.product_segment} | ${result.modifiedCount} products updated`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Image assignment complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📊 Summary:");
    console.log(`  - ${updatedCount} categories updated with images`);
    console.log(`  - ${productsUpdated} products updated with category images`);
    console.log(`  - Images location: backend/public/images/categories/`);
    console.log(`  - Image format: SVG (scalable, small file size)`);

    console.log("\n🎯 Usage:");
    console.log("  - Categories API will return image_url field");
    console.log("  - Products API will return image_url field");
    console.log("  - Mobile app can display these images directly");
    console.log("  - Replace with real images later by uploading via UI");

    console.log("\n📱 Testing:");
    console.log("  - View categories in frontend: http://localhost:3000/products/categories");
    console.log("  - API endpoint: http://localhost:5000/api/v1/categories");
    console.log("  - Image URL format: /images/categories/category-[timestamp]-[random].svg");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the script
assignCategoryImages();
