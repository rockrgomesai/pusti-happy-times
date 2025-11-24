/**
 * Assign Collections Menu to Finance Role
 * Finance needs access to the Collections page to approve payments
 */

const mongoose = require("mongoose");
const SidebarMenuItem = require("./src/models/SidebarMenuItem");
const { Role } = require("./src/models");
const { RoleSidebarMenuItem } = require("./src/models/JunctionTables");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function assignCollectionsToFinance() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Finance role
    const financeRole = await Role.findOne({ role: "Finance" });
    if (!financeRole) {
      console.log("❌ Finance role not found!");
      process.exit(1);
    }
    console.log(`✅ Found Finance role (${financeRole._id})`);

    // Find Order Management parent menu
    const parentMenu = await SidebarMenuItem.findOne({
      label: "Order Management",
      is_submenu: false,
    });

    if (!parentMenu) {
      console.log("❌ Order Management parent menu not found!");
      process.exit(1);
    }
    console.log(`✅ Found Order Management parent (${parentMenu._id})`);

    // Find Payments menu (renamed from Collections)
    console.log("\nSearching for Payments menu...");

    let paymentsMenu = await SidebarMenuItem.findOne({
      label: "Payments",
      parent_id: parentMenu._id,
    });
    console.log("  With parent_id:", paymentsMenu ? "Found" : "Not found");

    // If not found with parent_id, search by label only
    if (!paymentsMenu) {
      paymentsMenu = await SidebarMenuItem.findOne({
        label: "Payments",
      });
      console.log("  By label only:", paymentsMenu ? "Found" : "Not found");
    }

    // Try searching by href
    if (!paymentsMenu) {
      paymentsMenu = await SidebarMenuItem.findOne({
        href: "/ordermanagement/collections",
      });
      console.log("  By href:", paymentsMenu ? "Found" : "Not found");
    }

    if (!paymentsMenu) {
      console.log("\n❌ Payments menu not found! Creating it...");

      // Create the Payments menu
      paymentsMenu = await SidebarMenuItem.create({
        label: "Payments",
        href: "/ordermanagement/collections",
        icon: "FaMoneyBillWave",
        parent_id: parentMenu._id,
        is_submenu: true,
        m_order: 5.2,
      });
      console.log(`✅ Created Payments menu (${paymentsMenu._id})`);
    } else {
      console.log(`✅ Found Payments menu (${paymentsMenu._id})`);
    }

    // Assign parent menu to Finance if not already
    const parentAssignment = await RoleSidebarMenuItem.findOne({
      role_id: financeRole._id,
      sidebar_menu_item_id: parentMenu._id,
    });

    if (!parentAssignment) {
      await RoleSidebarMenuItem.create({
        role_id: financeRole._id,
        sidebar_menu_item_id: parentMenu._id,
      });
      console.log("✅ Assigned Order Management parent to Finance");
    } else {
      console.log("ℹ️  Order Management already assigned to Finance");
    }

    // Assign Payments menu to Finance
    const paymentsAssignment = await RoleSidebarMenuItem.findOne({
      role_id: financeRole._id,
      sidebar_menu_item_id: paymentsMenu._id,
    });

    if (!paymentsAssignment) {
      await RoleSidebarMenuItem.create({
        role_id: financeRole._id,
        sidebar_menu_item_id: paymentsMenu._id,
      });
      console.log("✅ Assigned Payments menu to Finance");
    } else {
      console.log("ℹ️  Payments already assigned to Finance");
    }

    console.log("\n🎉 Setup complete!");
    console.log("⚠️  Finance users must logout and login to see the Payments menu.");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

assignCollectionsToFinance();
