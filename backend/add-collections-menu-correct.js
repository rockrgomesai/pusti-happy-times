/**
 * Add Collections Menu Item (Correct Schema)
 */

const mongoose = require("mongoose");
const SidebarMenuItem = require("./src/models/SidebarMenuItem");
const Role = require("./src/models/Role");
const { RoleSidebarMenuItem } = require("./src/models/JunctionTables");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addCollectionsMenu() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // 1. Find Order Management parent
    console.log("📋 Looking for Order Management parent menu...");
    let parentMenu = await SidebarMenuItem.findOne({
      label: "Order Management",
      is_submenu: false,
    });

    if (!parentMenu) {
      console.log("   ❌ Order Management parent not found!");
      console.log("   Creating parent menu...");

      parentMenu = await SidebarMenuItem.create({
        label: "Order Management",
        href: null,
        icon: "FaShoppingCart",
        parent_id: null,
        is_submenu: false,
        m_order: 90,
      });
      console.log(`   ✅ Created parent: Order Management (${parentMenu._id})`);
    } else {
      console.log(`   ✅ Found parent: Order Management (${parentMenu._id})`);
    }

    // 2. Check if Collections menu already exists
    console.log("\n📋 Checking for Collections menu...");
    let collectionsMenu = await SidebarMenuItem.findOne({
      label: "Collections",
      parent_id: parentMenu._id,
    });

    if (collectionsMenu) {
      console.log(`   ✅ Collections menu already exists (${collectionsMenu._id})`);
    } else {
      console.log("   Creating Collections menu...");

      collectionsMenu = await SidebarMenuItem.create({
        label: "Collections",
        href: "/ordermanagement/collections",
        icon: "FaMoneyBillWave",
        parent_id: parentMenu._id,
        is_submenu: true,
        m_order: 2,
      });
      console.log(`   ✅ Created: Collections (${collectionsMenu._id})`);
    }

    // 3. Assign to Distributor role
    console.log("\n📋 Assigning to Distributor role...");
    const distributorRole = await Role.findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.log("   ❌ Distributor role not found!");
      process.exit(1);
    }

    console.log(`   Found: Distributor (${distributorRole._id})`);

    // Check if parent is assigned
    const parentAssignment = await RoleSidebarMenuItem.findOne({
      role_id: distributorRole._id,
      sidebar_menu_item_id: parentMenu._id,
    });

    if (!parentAssignment) {
      await RoleSidebarMenuItem.create({
        role_id: distributorRole._id,
        sidebar_menu_item_id: parentMenu._id,
      });
      console.log("   ✅ Assigned parent menu to Distributor");
    } else {
      console.log("   ✅ Parent already assigned");
    }

    // Check if Collections is assigned
    const collectionsAssignment = await RoleSidebarMenuItem.findOne({
      role_id: distributorRole._id,
      sidebar_menu_item_id: collectionsMenu._id,
    });

    if (!collectionsAssignment) {
      await RoleSidebarMenuItem.create({
        role_id: distributorRole._id,
        sidebar_menu_item_id: collectionsMenu._id,
      });
      console.log("   ✅ Assigned Collections to Distributor");
    } else {
      console.log("   ✅ Collections already assigned");
    }

    console.log("\n✨ Collections menu setup complete!");
    console.log("\n⚠️  Note: Users need to logout and login again to see the new menu item.");

    await mongoose.connection.close();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

addCollectionsMenu();
