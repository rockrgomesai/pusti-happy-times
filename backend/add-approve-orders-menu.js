/**
 * Add "Approve Orders" menu item under Order Management for ASM
 */

const mongoose = require("mongoose");
const { Role } = require("./src/models");
const SidebarMenuItem = require("./src/models/SidebarMenuItem");
const { RoleSidebarMenuItem } = require("./src/models/JunctionTables");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addApproveOrdersMenu() {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Order Management parent menu (using actual DB field 'label')
    const orderManagementMenu = await SidebarMenuItem.findOne({
      label: "Order Management",
    }).lean();

    if (!orderManagementMenu) {
      console.log("❌ Order Management menu not found!");
      process.exit(1);
    }

    console.log(`✅ Found Order Management menu (${orderManagementMenu._id})`);

    // Create or find "Approve Orders" menu item
    let approveOrdersMenu = await SidebarMenuItem.findOne({
      label: "Approve Orders",
    });

    if (!approveOrdersMenu) {
      // Insert directly into DB to match existing schema structure
      const db = mongoose.connection.db;
      const result = await db.collection("sidebar_menu_items").insertOne({
        label: "Approve Orders",
        href: "/ordermanagement/approveorders",
        icon: "FaCheckCircle",
        parent_id: orderManagementMenu._id,
        m_order: 5.3,
        is_submenu: true,
      });

      approveOrdersMenu = await SidebarMenuItem.findById(result.insertedId);
      console.log(`✅ Created menu item: Approve Orders (${approveOrdersMenu._id})`);
    } else {
      console.log(`ℹ️  Menu item exists: Approve Orders (${approveOrdersMenu._id})`);
    }

    // Find ASM role
    const asmRole = await Role.findOne({ role: "ASM" });

    if (!asmRole) {
      console.log("❌ ASM role not found!");
      process.exit(1);
    }

    console.log(`✅ Found ASM role (${asmRole._id})`);

    // Assign menu to ASM role
    const existing = await RoleSidebarMenuItem.findOne({
      role_id: asmRole._id,
      sidebar_menu_item_id: approveOrdersMenu._id,
    });

    if (existing) {
      console.log("\n✅ Menu 'Approve Orders' is already assigned to ASM role!");
    } else {
      await RoleSidebarMenuItem.create({
        role_id: asmRole._id,
        sidebar_menu_item_id: approveOrdersMenu._id,
      });
      console.log("\n✅ Successfully assigned 'Approve Orders' menu to ASM role!");
    }

    // Also assign Order Management parent to ASM if not already
    const parentExists = await RoleSidebarMenuItem.findOne({
      role_id: asmRole._id,
      sidebar_menu_item_id: orderManagementMenu._id,
    });

    if (!parentExists) {
      await RoleSidebarMenuItem.create({
        role_id: asmRole._id,
        sidebar_menu_item_id: orderManagementMenu._id,
      });
      console.log("✅ Assigned 'Order Management' parent menu to ASM role!");
    }

    console.log("\n⚠️  ASM users must logout and login to see the new menu.\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addApproveOrdersMenu();
