/**
 * Remove Scheduled List menu from Inventory Depot role
 * This menu is not needed - Depot Deliveries is the correct workbench
 *
 * Usage: node remove-scheduled-list-from-depot.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const models = require("./src/models");

async function removeScheduledList() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Get Inventory Depot role
    const role = await models.Role.findById("690750354bdacd1e192d1ab3").lean();

    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    console.log("=== REMOVING SCHEDULED LIST FROM INVENTORY DEPOT ===");
    console.log("Role:", role.role_name);
    console.log("ID:", role._id, "\n");

    // Find "Scheduled List" menu item
    const menuItem = await models.SidebarMenuItem.findOne({
      label: "Scheduled List",
    }).lean();

    if (!menuItem) {
      console.log("❌ Scheduled List menu item not found");
      process.exit(1);
    }

    console.log("Found menu item:", menuItem.label);

    // Remove the link between role and menu item
    const result = await models.RoleSidebarMenuItem.deleteOne({
      role_id: role._id,
      sidebar_menu_item_id: menuItem._id,
    });

    if (result.deletedCount > 0) {
      console.log("✓ Removed Scheduled List from Inventory Depot role");
    } else {
      console.log("⊘ Scheduled List was not assigned to this role");
    }

    // Verify final menu count
    const remainingMenus = await models.RoleSidebarMenuItem.find({
      role_id: role._id,
    }).countDocuments();

    console.log(`\n✓ Inventory Depot now has ${remainingMenus} menu items`);
    console.log("\nNext step: User should log out and log back in to see the change");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

removeScheduledList();
