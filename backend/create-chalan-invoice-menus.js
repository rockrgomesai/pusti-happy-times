const mongoose = require("mongoose");
const models = require("./src/models");

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

const menuItems = [
  {
    label: "Delivery Chalans",
    href: "/inventory/delivery-chalans",
    icon: "Description",
    m_order: 16,
    parent_id: null,
    is_submenu: false,
  },
  {
    label: "Delivery Invoices",
    href: "/inventory/delivery-invoices",
    icon: "Receipt",
    m_order: 17,
    parent_id: null,
    is_submenu: false,
  },
];

async function createMenuItems() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find Inventory Depot role by ID (role field has quotes which makes searching difficult)
    const inventoryDepotRole = await models.Role.findById("690750354bdacd1e192d1ab3");
    if (!inventoryDepotRole) {
      console.log("⚠️  Warning: 'Inventory Depot' role not found");
      console.log("   Please create the role or assign menu items manually");
      process.exit(0);
    }

    // Create or update menu items and link to role
    for (const menuItem of menuItems) {
      const existing = await models.SidebarMenuItem.findOne({
        label: menuItem.label,
        href: menuItem.href,
      });

      let menuDoc;
      if (existing) {
        console.log(`⏭️  Menu item already exists: ${menuItem.label}`);
        menuDoc = existing;
      } else {
        menuDoc = await models.SidebarMenuItem.create({
          ...menuItem,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`✅ Created menu item: ${menuItem.label}`);
      }

      // Link to role
      const existingRoleMenu = await models.RoleSidebarMenuItem.findOne({
        role_id: inventoryDepotRole._id,
        sidebar_menu_item_id: menuDoc._id,
      });

      if (!existingRoleMenu) {
        await models.RoleSidebarMenuItem.create({
          role_id: inventoryDepotRole._id,
          sidebar_menu_item_id: menuDoc._id,
        });
        console.log(`   ✓ Linked to role: ${inventoryDepotRole.role}`);
      } else {
        console.log(`   ⊘ Already linked to role`);
      }
    }

    // Also need to get all menu item IDs for backward compatibility
    const menuDocs = await models.SidebarMenuItem.find({
      label: { $in: menuItems.map((m) => m.label) },
    });
    const menuIds = menuDocs.map((m) => m._id);

    console.log("\n✅ Menu item creation complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createMenuItems();
