/**
 * Remove "Receive Chalans" menu from Inventory Depot role
 * That menu is for Distributors, not Depots
 *
 * Usage: node remove-depot-receive-chalans.js
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

    console.log("\n=== Removing 'Receive Chalans' from Inventory Depot ===\n");

    // Find Inventory Depot role
    const depotRole = await Role.findOne({ role: "Inventory Depot" });
    if (!depotRole) {
      console.error("✗ Inventory Depot role not found");
      process.exit(1);
    }

    console.log(`✓ Found Inventory Depot role: ${depotRole._id}\n`);

    // Find "Receive Chalans" menu item
    const receiveChalansMenu = await SidebarMenuItem.findOne({
      href: "/distributor/receive",
    });

    if (!receiveChalansMenu) {
      console.log("✗ Receive Chalans menu not found");
      process.exit(0);
    }

    console.log(`✓ Found menu: ${receiveChalansMenu.label} (${receiveChalansMenu.href})\n`);

    // Remove the assignment
    const result = await RoleSidebarMenuItem.deleteOne({
      role_id: depotRole._id,
      sidebar_menu_item_id: receiveChalansMenu._id,
    });

    if (result.deletedCount > 0) {
      console.log(`✓ Removed "Receive Chalans" from Inventory Depot role\n`);
    } else {
      console.log(`  "Receive Chalans" was not assigned to Inventory Depot\n`);
    }

    // Summary
    const totalMenus = await RoleSidebarMenuItem.countDocuments({
      role_id: depotRole._id,
    });

    console.log("=== Summary ===\n");
    console.log(`Inventory Depot Role:`);
    console.log(`  - ${totalMenus} menu items`);

    // Show remaining workflow menus
    const depotMenus = await RoleSidebarMenuItem.find({
      role_id: depotRole._id,
    })
      .populate("sidebar_menu_item_id")
      .lean();

    const workflowMenus = depotMenus
      .map((rm) => rm.sidebar_menu_item_id)
      .filter((menu) => {
        if (!menu || !menu.href) return false;
        const href = menu.href;
        return (
          href.includes("schedule") ||
          href.includes("loadsheet") ||
          href.includes("chalan") ||
          href.includes("delivery") ||
          href.includes("invoice")
        );
      });

    if (workflowMenus.length > 0) {
      console.log(`\nDistribution Workflow Menus (Depot side):`);
      workflowMenus.forEach((menu) => {
        console.log(`  - ${menu.label} → ${menu.href}`);
      });
    }

    console.log("\n✓ Depot can now: View approved schedules, Create Load Sheets, Create Chalans\n");
    console.log("Note: Distributors receive chalans, Depots create them\n");

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
