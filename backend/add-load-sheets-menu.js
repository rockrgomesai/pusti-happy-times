require("dotenv").config();
const mongoose = require("mongoose");

async function addLoadSheetsMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");
    const SidebarMenuItem = mongoose.model(
      "SidebarMenuItem",
      new mongoose.Schema({}, { strict: false }),
      "sidebar_menu_items"
    );

    const role = await Role.findOne({ role: "Inventory Depot" });
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    const RoleMenuItems = mongoose.model(
      "RoleMenuItems",
      new mongoose.Schema({}, { strict: false }),
      "role_sidebar_menu_items"
    );

    // Check if Load Sheets menu already exists
    let loadSheetMenu = await SidebarMenuItem.findOne({
      label: "Load Sheets",
      href: "/distribution/load-sheets",
    });

    if (!loadSheetMenu) {
      console.log("Creating Load Sheets menu item...");

      // Find the highest order number
      const allMenus = await SidebarMenuItem.find({}).sort({ m_order: -1 });
      const maxOrder = allMenus.length > 0 ? allMenus[0].m_order || 0 : 0;

      loadSheetMenu = await SidebarMenuItem.create({
        label: "Load Sheets",
        icon: "LocalShipping",
        href: "/distribution/load-sheets",
        parent_id: null,
        m_order: maxOrder + 1,
        is_submenu: false,
      });

      console.log("✓ Created Load Sheets menu item");
    } else {
      console.log("✓ Load Sheets menu item already exists");
    }

    // Check if role already has access to this menu
    const roleMenuLink = await RoleMenuItems.findOne({
      role_id: role._id,
      sidebar_menu_item_id: loadSheetMenu._id,
    });

    if (!roleMenuLink) {
      await RoleMenuItems.create({
        role_id: role._id,
        sidebar_menu_item_id: loadSheetMenu._id,
      });
      console.log("✓ Granted Load Sheets menu access to Inventory Depot role");
    } else {
      console.log("✓ Inventory Depot already has access to Load Sheets menu");
    }

    console.log("\n✅ Done!");
    console.log("Please log out and log back in to see the new menu.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addLoadSheetsMenu();
