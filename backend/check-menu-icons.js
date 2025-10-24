require("dotenv").config();
const mongoose = require("mongoose");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkIcons() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;
    const menuItems = await db
      .collection("sidebar_menu_items")
      .find({})
      .sort({ m_order: 1 })
      .toArray();

    console.log("📋 Menu Items with Icons:\n");
    menuItems.forEach((item) => {
      if (
        item.label.toLowerCase().includes("product") ||
        item.label.toLowerCase().includes("offer") ||
        item.label.toLowerCase().includes("brand") ||
        item.label.toLowerCase().includes("category")
      ) {
        console.log(`  ${item.label}`);
        console.log(`    Icon: ${item.icon}`);
        console.log("");
      }
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkIcons();
