/**
 * Add Territory Menu Item under Master
 */

const mongoose = require("mongoose");
const SidebarMenuItem = require("./src/models/SidebarMenuItem");
const Role = require("./src/models/Role");
const { RoleSidebarMenuItem } = require("./src/models/JunctionTables");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function addTerritoryMenu() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // 1. Find Master parent menu
    console.log("📋 Looking for Master parent menu...");
    const masterMenu = await SidebarMenuItem.findOne({
      label: "Master",
      is_submenu: false,
    });

    if (!masterMenu) {
      console.log("   ❌ Master parent menu not found!");
      process.exit(1);
    }
    console.log(`   ✅ Found Master menu (${masterMenu._id})`);

    // 2. Check if Territory menu already exists
    console.log("\n📋 Checking for Territory menu...");

    // Use direct collection access to match the existing schema
    const db = mongoose.connection.db;
    let territoryMenu = await db.collection("sidebar_menu_items").findOne({
      label: "Territory",
      parent_id: masterMenu._id,
    });

    if (territoryMenu) {
      console.log(`   ✅ Territory menu already exists (${territoryMenu._id})`);
    } else {
      console.log("   Creating Territory menu...");

      // Get max m_order for Master submenu items
      const maxOrderItem = await db
        .collection("sidebar_menu_items")
        .find({
          parent_id: masterMenu._id,
          is_submenu: true,
        })
        .sort({ m_order: -1 })
        .limit(1)
        .toArray();

      const newOrder = maxOrderItem.length > 0 ? maxOrderItem[0].m_order + 0.1 : 3.5;

      const result = await db.collection("sidebar_menu_items").insertOne({
        label: "Territory",
        href: "/master/territories",
        icon: "FaMapMarkedAlt",
        parent_id: masterMenu._id,
        is_submenu: true,
        m_order: newOrder,
      });

      territoryMenu = { _id: result.insertedId };
      console.log(`   ✅ Created: Territory (${territoryMenu._id}) with order ${newOrder}`);
    }

    // 3. Assign to SuperAdmin role
    console.log("\n📋 Assigning to SuperAdmin role...");
    const superAdminRole = await Role.findOne({ role: "SuperAdmin" });

    if (!superAdminRole) {
      console.log("   ❌ SuperAdmin role not found!");
      process.exit(1);
    }

    console.log(`   Found: SuperAdmin (${superAdminRole._id})`);

    // Check if Master parent is assigned
    const parentAssignment = await RoleSidebarMenuItem.findOne({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: masterMenu._id,
    });

    if (!parentAssignment) {
      await RoleSidebarMenuItem.create({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: masterMenu._id,
      });
      console.log("   ✅ Assigned Master menu to SuperAdmin");
    } else {
      console.log("   ✅ Master already assigned");
    }

    // Check if Territory is assigned
    const territoryAssignment = await RoleSidebarMenuItem.findOne({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: new mongoose.Types.ObjectId(territoryMenu._id),
    });

    if (!territoryAssignment) {
      await RoleSidebarMenuItem.create({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: new mongoose.Types.ObjectId(territoryMenu._id),
      });
      console.log("   ✅ Assigned Territory menu to SuperAdmin");
    } else {
      console.log("   ✅ Territory already assigned to SuperAdmin");
    }

    console.log("\n✅ Territory menu setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addTerritoryMenu();
