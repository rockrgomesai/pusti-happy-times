/**
 * Script to verify Sales Admin menu items
 *
 * Usage: node verify-sales-admin-menu.js
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

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Sales Admin Menu Items ===\n");

    // Find Sales Admin role
    const salesAdminRole = await Role.findOne({ role: "Sales Admin" });
    if (!salesAdminRole) {
      console.error("✗ Sales Admin role not found");
      process.exit(1);
    }

    console.log(`Role: ${salesAdminRole.name || salesAdminRole.role}`);
    console.log(`Role ID: ${salesAdminRole._id}\n`);

    // Get all menu items for Sales Admin
    const roleMenuItems = await RoleSidebarMenuItem.find({
      role_id: salesAdminRole._id,
    }).populate("sidebar_menu_item_id");

    console.log(`Total menu items: ${roleMenuItems.length}\n`);

    // Display each menu item
    console.log("Menu Items:");
    roleMenuItems.forEach((rm, index) => {
      const menu = rm.sidebar_menu_item_id;
      if (menu) {
        const label = menu.label || menu.title || "N/A";
        const href = menu.href || menu.path || "N/A";
        const icon = menu.icon || "N/A";
        const order = menu.m_order || menu.sortOrder || 0;

        console.log(`${index + 1}. ${label}`);
        console.log(`   Path: ${href}`);
        console.log(`   Icon: ${icon}`);
        console.log(`   Order: ${order}`);
        console.log("");
      }
    });

    // Check specifically for DO List items
    console.log("=== DO-related Menu Items ===\n");
    const doMenus = roleMenuItems.filter((rm) => {
      const menu = rm.sidebar_menu_item_id;
      return menu && menu.href && menu.href.includes("/demandorder/");
    });

    if (doMenus.length > 0) {
      console.log(`✓ Found ${doMenus.length} DO-related menu items:\n`);
      doMenus.forEach((rm) => {
        const menu = rm.sidebar_menu_item_id;
        console.log(`  • ${menu.label || menu.title} → ${menu.href || menu.path}`);
      });
    } else {
      console.log("✗ No DO-related menu items found for Sales Admin");
    }

    console.log("");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
