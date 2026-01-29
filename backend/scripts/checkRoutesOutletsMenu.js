const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const { SidebarMenuItem } = require("../src/models");
const { RoleSidebarMenuItem } = require("../src/models/JunctionTables");
const { Role } = require("../src/models");

async function checkMenu() {
  try {
    await connectDB();

    console.log("\n📋 Routes & Outlets Menu Items:\n");

    const parent = await SidebarMenuItem.findOne({ label: "Routes & Outlets", parent_id: null });
    console.log("Parent:", parent ? `${parent.label} (${parent._id})` : "NOT FOUND");

    const children = await SidebarMenuItem.find({ parent_id: parent?._id }).sort({ m_order: 1 });
    console.log(`\nChildren (${children.length}):`);
    children.forEach((c) => console.log(`  - ${c.label} (${c.href}) [order: ${c.m_order}]`));

    console.log("\n🔐 Role Assignments for SuperAdmin:\n");
    const superAdmin = await Role.findOne({ role: "SuperAdmin" });

    if (superAdmin) {
      const assignments = await RoleSidebarMenuItem.find({ role_id: superAdmin._id }).populate(
        "sidebar_menu_item_id"
      );

      const routesOutlets = assignments.filter(
        (a) =>
          a.sidebar_menu_item_id &&
          (a.sidebar_menu_item_id.label === "Routes & Outlets" ||
            a.sidebar_menu_item_id.parent_id?.toString() === parent?._id?.toString())
      );

      console.log(`Total assignments for Routes & Outlets module: ${routesOutlets.length}`);
      routesOutlets.forEach((a) => {
        if (a.sidebar_menu_item_id) {
          console.log(`  - ${a.sidebar_menu_item_id.label}`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkMenu();
