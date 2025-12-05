/**
 * Check existing menu structure
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected");

    const db = mongoose.connection.db;
    const menuCollection = db.collection("sidebar_menu_items");

    // Get one example menu item
    const example = await menuCollection.findOne({ level: 0 });

    if (example) {
      console.log("\n📋 Example Menu Item Structure:\n");
      console.log(JSON.stringify(example, null, 2));
    } else {
      console.log("No menu items found");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

check();
