/**
 * Add Collections Menu Item
 * Run: node add-collections-menu.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function addCollectionsMenu() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const SidebarMenuItem = mongoose.model(
      "SidebarMenuItem",
      new mongoose.Schema({
        label: String,
        icon: String,
        path: String,
        parent_id: mongoose.Schema.Types.ObjectId,
        order: Number,
        level: Number,
        module: String,
      })
    );

    const RoleSidebarMenuItem = mongoose.model(
      "RoleSidebarMenuItem",
      new mongoose.Schema({
        role_id: mongoose.Schema.Types.ObjectId,
        sidebar_menu_item_id: mongoose.Schema.Types.ObjectId,
      })
    );

    const Role = mongoose.model(
      "Role",
      new mongoose.Schema({
        role: String,
      })
    );

    // Find Order Management parent menu
    const orderMgmtMenu = await SidebarMenuItem.findOne({
      label: "Order Management",
      level: 0,
    });

    if (!orderMgmtMenu) {
      console.error("❌ Order Management menu not found!");
      console.log("   Creating parent menu first...");

      const newOrderMgmtMenu = await SidebarMenuItem.create({
        label: "Order Management",
        icon: "ShoppingCart",
        path: "/ordermanagement",
        parent_id: null,
        order: 7,
        level: 0,
        module: "ordermanagement",
      });

      console.log("✅ Created Order Management parent menu\n");
    }

    const parentMenu =
      orderMgmtMenu || (await SidebarMenuItem.findOne({ label: "Order Management" }));

    // Check if Collections menu already exists
    const existingMenu = await SidebarMenuItem.findOne({
      label: "Collections",
      parent_id: parentMenu._id,
    });

    if (existingMenu) {
      console.log("⚠️  Collections menu already exists");
      console.log(`   ID: ${existingMenu._id}`);
      console.log(`   Path: ${existingMenu.path}\n`);
      return existingMenu;
    }

    // Find highest order in Order Management submenu
    const siblings = await SidebarMenuItem.find({
      parent_id: parentMenu._id,
    }).sort({ order: -1 });

    const nextOrder = siblings.length > 0 ? siblings[0].order + 1 : 1;

    // Create Collections menu item
    const collectionsMenu = await SidebarMenuItem.create({
      label: "Collections",
      icon: "Payment",
      path: "/ordermanagement/collections",
      parent_id: parentMenu._id,
      order: nextOrder,
      level: 1,
      module: "ordermanagement",
    });

    console.log("✅ Created Collections menu item");
    console.log(`   ID: ${collectionsMenu._id}`);
    console.log(`   Path: ${collectionsMenu.path}`);
    console.log(`   Order: ${collectionsMenu.order}\n`);

    // Assign to Distributor role
    console.log("📋 Assigning to Distributor role...\n");

    const distributorRole = await Role.findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.error("❌ Distributor role not found!");
      process.exit(1);
    }

    const existing = await RoleSidebarMenuItem.findOne({
      role_id: distributorRole._id,
      sidebar_menu_item_id: collectionsMenu._id,
    });

    if (existing) {
      console.log("   ⚠️  Already assigned to Distributor");
    } else {
      await RoleSidebarMenuItem.create({
        role_id: distributorRole._id,
        sidebar_menu_item_id: collectionsMenu._id,
      });
      console.log("   ✅ Assigned to Distributor role");
    }

    // Also assign parent menu if not already assigned
    const parentAssignment = await RoleSidebarMenuItem.findOne({
      role_id: distributorRole._id,
      sidebar_menu_item_id: parentMenu._id,
    });

    if (!parentAssignment) {
      await RoleSidebarMenuItem.create({
        role_id: distributorRole._id,
        sidebar_menu_item_id: parentMenu._id,
      });
      console.log("   ✅ Assigned Order Management parent to Distributor");
    }

    console.log("\n✨ Collections menu setup complete!");
    console.log("\n⚠️  Note: Users need to logout and login again to see the new menu item.");
  } catch (error) {
    console.error("❌ Error setting up menu:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the script
addCollectionsMenu();
