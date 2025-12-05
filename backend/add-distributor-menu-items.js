/**
 * Script to add sidebar menu items for Distributor role
 *
 * Creates menu items for:
 * - Receive Chalans (list pending chalans)
 * - My Stock (view current stock)
 * - Received History (view received chalans)
 *
 * IMPORTANT: Uses roles.role field (NOT roles.name)
 *
 * Usage: node add-distributor-menu-items.js
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

// Menu items to create
const menuItems = [
  {
    label: "Receive Chalans",
    href: "/distributor/receive",
    icon: "LocalShipping",
    m_order: 1,
    parent_id: null,
    is_submenu: false,
  },
  {
    label: "My Stock",
    href: "/distributor/stock",
    icon: "Inventory",
    m_order: 2,
    parent_id: null,
    is_submenu: false,
  },
  {
    label: "Received History",
    href: "/distributor/history",
    icon: "History",
    m_order: 3,
    parent_id: null,
    is_submenu: false,
  },
];

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Adding Distributor Menu Items ===\n");

    // Find Distributor role (using roles.role field)
    const distributorRole = await Role.findOne({ role: "Distributor" });
    if (!distributorRole) {
      console.error("✗ Distributor role not found");
      console.log("  Please ensure a role with role='Distributor' exists");
      process.exit(1);
    }
    console.log(`✓ Found Distributor role: ${distributorRole.name} (${distributorRole.role})`);

    // Create or find menu items
    const createdMenuItems = [];
    for (const item of menuItems) {
      let menuItem = await SidebarMenuItem.findOne({ path: item.href });

      if (!menuItem) {
        // Create using the database schema (label, m_order)
        const menuDoc = {
          label: item.label,
          href: item.href,
          icon: item.icon,
          m_order: item.m_order,
          parent_id: item.parent_id,
          is_submenu: item.is_submenu,
        };

        // Insert directly to bypass Mongoose validation
        const result = await SidebarMenuItem.collection.insertOne(menuDoc);
        menuItem = await SidebarMenuItem.findById(result.insertedId);
        console.log(`✓ Created menu item: ${item.label} (${item.href})`);
      } else {
        console.log(`  Menu item already exists: ${item.label} (${item.href})`);
      }

      createdMenuItems.push(menuItem);
    }

    // Assign menu items to Distributor role
    console.log("\n--- Assigning Menu Items to Distributor Role ---\n");

    for (const menuItem of createdMenuItems) {
      const existing = await RoleSidebarMenuItem.findOne({
        role_id: distributorRole._id,
        sidebar_menu_item_id: menuItem._id,
      });

      if (!existing) {
        await RoleSidebarMenuItem.create({
          role_id: distributorRole._id,
          sidebar_menu_item_id: menuItem._id,
        });
        console.log(`✓ Assigned: ${menuItem.label || menuItem.title} → Distributor`);
      } else {
        console.log(`  Already assigned: ${menuItem.label || menuItem.title} → Distributor`);
      }
    }

    // Summary
    console.log("\n=== Summary ===\n");
    const totalMenuItems = await RoleSidebarMenuItem.countDocuments({
      role_id: distributorRole._id,
    });
    console.log(`✓ Distributor role has ${totalMenuItems} active menu items`);
    console.log("\nMenu items for Distributor role:");

    const roleMenuItems = await RoleSidebarMenuItem.find({
      role_id: distributorRole._id,
    })
      .populate("sidebar_menu_item_id")
      .sort({ "sidebar_menu_item_id.sortOrder": 1 });

    roleMenuItems.forEach((rm) => {
      const menu = rm.sidebar_menu_item_id;
      const order = menu.m_order || menu.sortOrder || 0;
      const label = menu.label || menu.title;
      const path = menu.href || menu.path;
      console.log(`  ${order}. ${label} → ${path}`);
    });

    console.log("\n✓ Distributor menu items setup complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error:", error);
    process.exit(1);
  }
};

main();
