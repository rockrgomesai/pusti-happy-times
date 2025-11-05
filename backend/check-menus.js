require("dotenv").config();
const mongoose = require("mongoose");

async function checkMenus() {
  await mongoose.connect(process.env.MONGODB_URI);
  const menus = await mongoose.connection.db
    .collection("sidebar_menu_items")
    .find({ menu_item: { $regex: "inventor", $options: "i" } })
    .toArray();
  console.log("Inventory menus:", JSON.stringify(menus, null, 2));

  // Also check all parent menus
  const parents = await mongoose.connection.db
    .collection("sidebar_menu_items")
    .find({ parent_id: null })
    .toArray();
  console.log(
    "\nAll parent menus:",
    parents.map((m) => m.menu_item)
  );

  await mongoose.connection.close();
}

checkMenus();
