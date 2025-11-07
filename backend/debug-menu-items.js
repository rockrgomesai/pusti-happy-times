const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function checkAllMenus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Available collections:");
    collections.forEach((col) => console.log(`  - ${col.name}`));
    console.log("");

    // Check sidebar_menu_items collection
    const SidebarMenuItem = mongoose.connection.db.collection("sidebar_menu_items");
    const allMenuItems = await SidebarMenuItem.find({}).toArray();

    console.log(`\nTotal menu items in sidebar_menu_items: ${allMenuItems.length}\n`);

    // Show all menu items
    console.log("All menu items:");
    allMenuItems.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.label || item.name}`);
      console.log(`   _id: ${item._id}`);
      console.log(`   href: ${item.href || "null"}`);
      console.log(`   icon: ${item.icon || "null"}`);
      console.log(`   parent_id: ${item.parent_id || "null"}`);
      console.log(`   is_submenu: ${item.is_submenu}`);
      console.log(`   active: ${item.active}`);
      console.log(`   order: ${item.order || item.m_order || "null"}`);
    });

    // Search for Order Management specifically
    const orderMgmt = await SidebarMenuItem.findOne({
      $or: [{ label: "Order Management" }, { name: "Order Management" }],
    });

    console.log("\n\nSearching for 'Order Management':");
    if (orderMgmt) {
      console.log("FOUND:", JSON.stringify(orderMgmt, null, 2));
    } else {
      console.log("NOT FOUND");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAllMenus();
