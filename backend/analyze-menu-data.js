/**
 * Analyze Collections Menu Data
 */

const mongoose = require("mongoose");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function analyzeData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Check what's in the wrong collection
    console.log("📋 Data in sidebarmenuitems:");
    const wrongData = await db.collection("sidebarmenuitems").find({}).toArray();
    wrongData.forEach((item) => {
      console.log("\n", JSON.stringify(item, null, 2));
    });

    // Check a sample from correct collection
    console.log("\n\n📋 Sample data from sidebar_menu_items:");
    const correctData = await db.collection("sidebar_menu_items").findOne({ label: "Dashboard" });
    console.log(JSON.stringify(correctData, null, 2));

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

analyzeData();
