const mongoose = require("mongoose");
require("dotenv").config();

async function checkMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected");

    const collection = mongoose.connection.collection("sidebar_menu_items");
    const sample = await collection.findOne({ label: "Order Management" });

    console.log("Sample menu item structure:");
    console.log(JSON.stringify(sample, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkMenu();
