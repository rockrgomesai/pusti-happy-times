require("dotenv").config();
const mongoose = require("mongoose");

async function setupRequisitionListMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const SidebarMenuItem = mongoose.model(
      "SidebarMenuItem",
      new mongoose.Schema({}, { strict: false }),
      "sidebar_menu_items"
    );

    const RoleSidebarMenuItem = mongoose.model(
      "RoleSidebarMenuItem",
      new mongoose.Schema({}, { strict: false }),
      "role_sidebar_menu_items"
    );

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");

    // 1. Find Inventory parent menu item
    const inventoryMenu = await SidebarMenuItem.findOne({
      label: "Inventory",
      parent_id: null,
    });

    if (!inventoryMenu) {
      console.error("❌ Inventory parent menu not found!");
      process.exit(1);
    }

    console.log("Found Inventory menu:", inventoryMenu.label, "- ID:", inventoryMenu._id);

    // 2. Check if Requisition List menu item already exists
    const existingMenuItem = await SidebarMenuItem.findOne({
      label: "Requisition List",
      parent_id: inventoryMenu._id,
    });

    let menuItemId;

    if (existingMenuItem) {
      console.log("Requisition List menu item already exists:", existingMenuItem._id);
      menuItemId = existingMenuItem._id;
    } else {
      // Get the max m_order for Inventory children
      const maxSortOrder = await SidebarMenuItem.findOne({ parent_id: inventoryMenu._id })
        .sort({ m_order: -1 })
        .limit(1);

      const newSortOrder = maxSortOrder ? maxSortOrder.m_order + 0.1 : inventoryMenu.m_order + 0.1;

      // Create menu item
      const newMenuItem = new SidebarMenuItem({
        label: "Requisition List",
        href: "/inventory/requisitionlist",
        m_order: newSortOrder,
        icon: "FaClipboardList",
        parent_id: inventoryMenu._id,
        is_submenu: true,
      });

      await newMenuItem.save();
      menuItemId = newMenuItem._id;
      console.log("✅ Created Requisition List menu item:", menuItemId);
    }

    // 3. Assign menu item to Inventory Factory and Inventory Depot roles
    const roles = await Role.find({
      role: { $in: ["Inventory Factory", "Inventory Depot"] },
    });

    if (roles.length === 0) {
      console.error("❌ Inventory Factory/Depot roles not found!");
      process.exit(1);
    }

    for (const role of roles) {
      console.log(`\nProcessing role: ${role.role} (${role._id})`);

      // Check if menu item already assigned
      const existingMenuAssignment = await RoleSidebarMenuItem.findOne({
        role_id: role._id,
        sidebar_menu_item_id: menuItemId,
      });

      if (!existingMenuAssignment) {
        const roleMenuAssignment = new RoleSidebarMenuItem({
          role_id: role._id,
          sidebar_menu_item_id: menuItemId,
          can_view: true,
          can_create: false,
          can_update: false,
          can_delete: false,
        });
        await roleMenuAssignment.save();
        console.log(`✅ Assigned menu item to ${role.role}`);
      } else {
        console.log(`Menu item already assigned to ${role.role}`);
      }
    }

    console.log("\n✅ Requisition List menu setup completed!");
    console.log("\n📋 Summary:");
    console.log("- Menu Item: Requisition List (/inventory/requisitionlist)");
    console.log("- Assigned to: Inventory Factory, Inventory Depot roles");
    console.log("- Uses existing API permission: inventory:requisitions:read");
  } catch (error) {
    console.error("❌ Error setting up requisition list menu:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

setupRequisitionListMenu();
