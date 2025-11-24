/**
 * Add Distribution Scheduling Menu Item
 * Creates "Distribution Scheduling" menu under Order Management
 * and assigns it to Distribution role
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Models
const { Role, SidebarMenuItem } = require("./src/models");
const { RoleSidebarMenuItem } = require("./src/models/JunctionTables");

async function addDistributionMenu() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGODB_URI_LOCAL ||
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Find Order Management parent menu (using actual DB field 'label')
    const orderMgmtMenu = await SidebarMenuItem.findOne({
      label: "Order Management",
    }).lean();

    if (!orderMgmtMenu) {
      console.log("❌ Order Management menu not found");
      process.exit(1);
    }
    console.log(`✅ Found Order Management menu (${orderMgmtMenu._id})`);

    // Create Distribution Scheduling menu item
    let distributionMenu = await SidebarMenuItem.findOne({
      label: "Distribution Scheduling",
    });

    if (!distributionMenu) {
      // Insert directly into DB to match existing schema structure
      const db = mongoose.connection.db;
      const result = await db.collection("sidebar_menu_items").insertOne({
        label: "Distribution Scheduling",
        href: "/ordermanagement/distribution",
        icon: "FaTruck",
        parent_id: orderMgmtMenu._id,
        m_order: 5.4,
        is_submenu: true,
      });

      distributionMenu = await SidebarMenuItem.findById(result.insertedId);
      console.log(`✅ Created menu item: Distribution Scheduling (${distributionMenu._id})`);
    } else {
      console.log(`ℹ️  Menu item exists: Distribution Scheduling (${distributionMenu._id})`);
    }

    // Find Distribution role
    const distributionRole = await Role.findOne({ role: "Distribution" });
    if (!distributionRole) {
      console.log("❌ Distribution role not found");
      process.exit(1);
    }
    console.log(`✅ Found Distribution role (${distributionRole._id})`);

    // Check if menu already assigned to role
    const existing = await RoleSidebarMenuItem.findOne({
      role_id: distributionRole._id,
      sidebar_menu_item_id: distributionMenu._id,
    });

    if (existing) {
      console.log("\n✅ Menu 'Distribution Scheduling' is already assigned to Distribution role!");
    } else {
      // Assign menu to Distribution role
      await RoleSidebarMenuItem.create({
        role_id: distributionRole._id,
        sidebar_menu_item_id: distributionMenu._id,
      });
      console.log(
        "\n✅ Successfully assigned 'Distribution Scheduling' menu to Distribution role!"
      );
    }

    // Also assign Order Management parent to Distribution if not already
    const parentExists = await RoleSidebarMenuItem.findOne({
      role_id: distributionRole._id,
      sidebar_menu_item_id: orderMgmtMenu._id,
    });

    if (!parentExists) {
      await RoleSidebarMenuItem.create({
        role_id: distributionRole._id,
        sidebar_menu_item_id: orderMgmtMenu._id,
      });
      console.log("✅ Assigned 'Order Management' parent menu to Distribution role!");
    }

    console.log("\n🎉 Setup complete!");
    console.log("\nMenu Details:");
    console.log(`- Title: ${distributionMenu.label}`);
    console.log(`- URL: ${distributionMenu.href}`);
    console.log(`- Icon: ${distributionMenu.icon}`);
    console.log(`- Parent: Order Management`);
    console.log(`- Order: ${distributionMenu.m_order}`);
    console.log("\n⚠️  Distribution users must logout and login to see the new menu.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addDistributionMenu();
