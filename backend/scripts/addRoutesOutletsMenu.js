/**
 * Add "Routes & Outlets" menu with submenus
 * Run with: node backend/scripts/addRoutesOutletsMenu.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const { SidebarMenuItem } = require("../src/models");
const { RoleSidebarMenuItem } = require("../src/models/JunctionTables");

async function addRoutesOutletsMenu() {
  try {
    console.log("🔄 Connecting to database...");
    await connectDB();

    // Find the Product parent menu to get reference for ordering
    const productMenu = await SidebarMenuItem.findOne({ label: "Product" });
    const baseOrder = productMenu ? productMenu.m_order + 50 : 500;

    // Create parent menu: Routes & Outlets
    console.log("📝 Creating Routes & Outlets parent menu...");

    let parentMenu = await SidebarMenuItem.findOne({
      label: "Routes & Outlets",
      parent_id: null,
    });

    if (!parentMenu) {
      parentMenu = await SidebarMenuItem.create({
        label: "Routes & Outlets",
        href: "/routesoutlets",
        m_order: baseOrder,
        icon: "FaMapMarkedAlt",
        parent_id: null,
        is_submenu: true,
        created_by: "system",
        updated_by: "system",
      });
      console.log(`✅ Created parent menu: ${parentMenu._id}`);
    } else {
      console.log(`ℹ️  Parent menu already exists: ${parentMenu._id}`);
    }

    // Define submenu items
    const submenus = [
      { label: "Routes", href: "/routesoutlets/routes", order: 1, icon: "FaRoute" },
      { label: "Outlets", href: "/routesoutlets/outlets", order: 2, icon: "FaStore" },
      { label: "Outlet Types", href: "/routesoutlets/outlettypes", order: 3, icon: "FaTags" },
      {
        label: "Outlet Channels",
        href: "/routesoutlets/outletchannels",
        order: 4,
        icon: "FaSitemap",
      },
      {
        label: "Outlet Market Sizes",
        href: "/routesoutlets/outletmarketsizes",
        order: 5,
        icon: "FaChartBar",
      },
    ];

    console.log("\n📝 Creating submenu items...");
    const createdMenus = [];

    for (const item of submenus) {
      let submenu = await SidebarMenuItem.findOne({
        label: item.label,
        parent_id: parentMenu._id,
      });

      if (!submenu) {
        submenu = await SidebarMenuItem.create({
          label: item.label,
          href: item.href,
          m_order: item.order,
          icon: item.icon,
          parent_id: parentMenu._id,
          is_submenu: false,
          created_by: "system",
          updated_by: "system",
        });
        console.log(`   ✅ Created: ${item.label} (${item.href})`);
      } else {
        console.log(`   ℹ️  Already exists: ${item.label}`);
      }
      createdMenus.push({ parent: parentMenu, sub: submenu });
    }

    // Assign to roles: SuperAdmin, MIS, Sales Admin
    console.log("\n🔐 Assigning menus to roles...");
    const Role = require("../src/models/Role");
    const roleNames = ["SuperAdmin", "MIS", "Sales Admin"];

    for (const roleName of roleNames) {
      const role = await Role.findOne({ role: roleName });

      if (!role) {
        console.log(`⚠️  ${roleName} role not found. Skipping.`);
        continue;
      }

      console.log(`\n   Processing role: ${roleName}`);

      // Assign parent menu
      const existingParent = await RoleSidebarMenuItem.findOne({
        role_id: role._id,
        sidebar_menu_item_id: parentMenu._id,
      });

      if (!existingParent) {
        await RoleSidebarMenuItem.create({
          role_id: role._id,
          sidebar_menu_item_id: parentMenu._id,
        });
        console.log(`   ✅ Assigned parent menu to ${roleName}`);
      }

      // Assign all submenus
      for (const { sub } of createdMenus) {
        const existing = await RoleSidebarMenuItem.findOne({
          role_id: role._id,
          sidebar_menu_item_id: sub._id,
        });

        if (!existing) {
          await RoleSidebarMenuItem.create({
            role_id: role._id,
            sidebar_menu_item_id: sub._id,
          });
        }
      }
      console.log(`   ✅ Assigned all submenus to ${roleName}`);
    }

    console.log("\n✅ Successfully added Routes & Outlets menu structure!");
  } catch (error) {
    console.error("❌ Error adding menu:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Done");
    process.exit(0);
  }
}

addRoutesOutletsMenu();
