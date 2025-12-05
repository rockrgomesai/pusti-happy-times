/**
 * Script to add DO List menu items for Sales Admin role
 *
 * Creates menu items for:
 * - DO List (view all demand orders with territory scoping)
 * - My DO List (view DOs where user is involved)
 *
 * Usage: node add-sales-admin-menu.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Models
const models = require("./src/models");
const Role = models.Role;
const SidebarMenuItem = models.SidebarMenuItem;
const RoleSidebarMenuItem = models.RoleSidebarMenuItem;

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ MongoDB connected");
  } catch (error) {
    console.error("✗ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Menu items to create/find
const menuItems = [
  {
    label: "DO List",
    href: "/demandorder/do-list",
    icon: "ListAlt",
    m_order: 100,
    parent_id: null,
    is_submenu: false,
  },
  {
    label: "My DO List",
    href: "/demandorder/my-do-list",
    icon: "PersonOutline",
    m_order: 101,
    parent_id: null,
    is_submenu: false,
  },
];

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Adding Sales Admin Menu Items ===\n");

    // Find Sales Admin role
    const salesAdminRole = await Role.findOne({ role: "Sales Admin" });
    if (!salesAdminRole) {
      console.error("✗ Sales Admin role not found");
      console.log("  Please ensure a role with role='Sales Admin' exists");
      process.exit(1);
    }
    console.log(`✓ Found Sales Admin role: ${salesAdminRole.name} (${salesAdminRole.role})`);

    // Create or find menu items
    const createdMenuItems = [];
    for (const item of menuItems) {
      let menuItem = await SidebarMenuItem.findOne({ href: item.href });

      if (!menuItem) {
        // Create menu item
        const menuDoc = {
          label: item.label,
          href: item.href,
          icon: item.icon,
          m_order: item.m_order,
          parent_id: item.parent_id,
          is_submenu: item.is_submenu,
        };

        const result = await SidebarMenuItem.collection.insertOne(menuDoc);
        menuItem = await SidebarMenuItem.findById(result.insertedId);
        console.log(`✓ Created menu item: ${item.label} (${item.href})`);
      } else {
        console.log(`  Menu item already exists: ${item.label} (${item.href})`);
      }

      createdMenuItems.push(menuItem);
    }

    // Assign menu items to Sales Admin role
    console.log("\n--- Assigning Menu Items to Sales Admin Role ---\n");

    for (const menuItem of createdMenuItems) {
      const existing = await RoleSidebarMenuItem.findOne({
        role_id: salesAdminRole._id,
        sidebar_menu_item_id: menuItem._id,
      });

      if (!existing) {
        await RoleSidebarMenuItem.create({
          role_id: salesAdminRole._id,
          sidebar_menu_item_id: menuItem._id,
        });
        console.log(`✓ Assigned: ${menuItem.label} → Sales Admin`);
      } else {
        console.log(`  Already assigned: ${menuItem.label} → Sales Admin`);
      }
    }

    // Also assign to ASM, RSM, ZSM roles for field access
    console.log("\n--- Assigning Menu Items to Field Roles ---\n");

    const fieldRoles = ["ASM", "RSM", "ZSM"];
    for (const roleName of fieldRoles) {
      const role = await Role.findOne({ role: roleName });
      if (role) {
        for (const menuItem of createdMenuItems) {
          const existing = await RoleSidebarMenuItem.findOne({
            role_id: role._id,
            sidebar_menu_item_id: menuItem._id,
          });

          if (!existing) {
            await RoleSidebarMenuItem.create({
              role_id: role._id,
              sidebar_menu_item_id: menuItem._id,
            });
            console.log(`✓ Assigned: ${menuItem.label} → ${roleName}`);
          } else {
            console.log(`  Already assigned: ${menuItem.label} → ${roleName}`);
          }
        }
      } else {
        console.log(`  ⚠ ${roleName} role not found, skipping`);
      }
    }

    // Summary
    console.log("\n=== Summary ===\n");
    const totalMenuItems = await RoleSidebarMenuItem.countDocuments({
      role_id: salesAdminRole._id,
    });
    console.log(`✓ Sales Admin role has ${totalMenuItems} total menu items`);
    console.log("\nDO-related menu items:");

    const roleMenuItems = await RoleSidebarMenuItem.find({
      role_id: salesAdminRole._id,
      sidebar_menu_item_id: { $in: createdMenuItems.map((m) => m._id) },
    })
      .populate("sidebar_menu_item_id")
      .sort({ "sidebar_menu_item_id.m_order": 1 });

    roleMenuItems.forEach((rm) => {
      const menu = rm.sidebar_menu_item_id;
      const order = menu.m_order || menu.sortOrder || 0;
      const label = menu.label || menu.title;
      const path = menu.href || menu.path;
      console.log(`  ${order}. ${label} → ${path}`);
    });

    console.log("\n✓ Sales Admin menu items setup complete!\n");

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
