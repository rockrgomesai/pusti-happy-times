/**
 * Test user-menu API endpoint
 *
 * Usage: node test-user-menu-api.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Models
const models = require("./src/models");
const Role = models.Role;
const User = models.User;
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

    console.log("\n=== Testing User Menu API Logic ===\n");

    // Find Sales Admin role
    const salesAdminRole = await Role.findOne({ role: "Sales Admin" });
    if (!salesAdminRole) {
      console.error("✗ Sales Admin role not found");
      process.exit(1);
    }

    console.log(`Testing with role: ${salesAdminRole.role}`);
    console.log(`Role ID: ${salesAdminRole._id}\n`);

    // Simulate the API endpoint logic
    const roleMenuItems = await RoleSidebarMenuItem.find({
      role_id: salesAdminRole._id,
    })
      .populate({
        path: "sidebar_menu_item_id",
      })
      .lean();

    console.log(`Found ${roleMenuItems.length} role menu assignments\n`);

    // Extract menu items
    const menuItems = roleMenuItems.map((item) => item.sidebar_menu_item_id).filter(Boolean);

    console.log(`Resolved ${menuItems.length} menu items\n`);

    if (menuItems.length > 0) {
      console.log("Sample menu item structure:");
      console.log(JSON.stringify(menuItems[0], null, 2));
      console.log("");

      // Find DO-related menus
      const doMenus = menuItems.filter((item) => item.href && item.href.includes("/demandorder/"));

      console.log(`\n=== DO-Related Menus (${doMenus.length}) ===\n`);

      if (doMenus.length > 0) {
        doMenus.forEach((menu, index) => {
          console.log(`${index + 1}. ${menu.label}`);
          console.log(`   href: ${menu.href}`);
          console.log(`   icon: ${menu.icon}`);
          console.log(`   m_order: ${menu.m_order}`);
          console.log("");
        });

        console.log("✓ Sales Admin has access to DO menu items!");
      } else {
        console.log("✗ No DO-related menu items found");
      }
    } else {
      console.log("✗ No menu items resolved from assignments");
    }

    console.log("");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
