require("dotenv").config();
const mongoose = require("mongoose");

async function checkMenus() {
  await mongoose.connect(process.env.MONGODB_URI);
  const all = await mongoose.connection.db
    .collection("sidebar_menu_items")
    .find({})
    .limit(20)
    .toArray();
  console.log("All menus (first 20):", JSON.stringify(all, null, 2));

  await mongoose.connection.close();
}

checkMenus();
