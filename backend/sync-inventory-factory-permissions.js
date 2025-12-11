/**
 * Sync Inventory Factory permissions from Inventory Depot
 * Ensures Inventory Factory has ALL Inventory Depot capabilities + production receiving
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function syncPermissions() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Find both roles
    const depotRole = await db.collection("roles").findOne({ role: "Inventory Depot" });
    const factoryRole = await db.collection("roles").findOne({ role: "Inventory Factory" });

    if (!depotRole || !factoryRole) {
      console.log("❌ Roles not found!");
      process.exit(1);
    }

    console.log("=== SYNCING PERMISSIONS: Depot → Factory ===\n");

    // Get all depot permissions
    const depotRolePerms = await db
      .collection("role_api_permissions")
      .find({ role_id: depotRole._id })
      .toArray();

    const factoryRolePerms = await db
      .collection("role_api_permissions")
      .find({ role_id: factoryRole._id })
      .toArray();

    const factoryPermIds = new Set(factoryRolePerms.map((p) => p.api_permission_id.toString()));

    // Copy missing permissions
    let addedCount = 0;

    for (const depotPerm of depotRolePerms) {
      const permId = depotPerm.api_permission_id.toString();

      if (!factoryPermIds.has(permId)) {
        // Add permission to factory
        await db.collection("role_api_permissions").insertOne({
          role_id: factoryRole._id,
          api_permission_id: depotPerm.api_permission_id,
        });

        // Get permission name for logging
        const permDoc = await db
          .collection("api_permissions")
          .findOne({ _id: depotPerm.api_permission_id });

        console.log(`  ➕ Added: ${permDoc?.api_permissions || permId}`);
        addedCount++;
      }
    }

    if (addedCount === 0) {
      console.log("  ✅ All permissions already synced");
    } else {
      console.log(`\n✅ Added ${addedCount} permissions to Inventory Factory`);
    }

    // Sync menu items
    console.log("\n=== SYNCING MENU ITEMS: Depot → Factory ===\n");

    const depotMenus = await db
      .collection("role_sidebar_menu_items")
      .find({ role_id: depotRole._id })
      .toArray();

    const factoryMenus = await db
      .collection("role_sidebar_menu_items")
      .find({ role_id: factoryRole._id })
      .toArray();

    const factoryMenuIds = new Set(factoryMenus.map((m) => m.sidebar_menu_item_id.toString()));

    let addedMenuCount = 0;

    for (const depotMenu of depotMenus) {
      const menuId = depotMenu.sidebar_menu_item_id.toString();

      if (!factoryMenuIds.has(menuId)) {
        // Add menu to factory
        await db.collection("role_sidebar_menu_items").insertOne({
          role_id: factoryRole._id,
          sidebar_menu_item_id: depotMenu.sidebar_menu_item_id,
        });

        // Get menu name for logging
        const menuDoc = await db
          .collection("sidebar_menu_items")
          .findOne({ _id: depotMenu.sidebar_menu_item_id });

        console.log(`  ➕ Added menu: ${menuDoc?.label || menuId}`);
        addedMenuCount++;
      }
    }

    if (addedMenuCount === 0) {
      console.log("  ✅ All menus already synced");
    } else {
      console.log(`\n✅ Added ${addedMenuCount} menus to Inventory Factory`);
    }

    // Summary
    console.log("\n=== SYNC COMPLETE ===");
    console.log(`✅ Inventory Factory now has ALL Inventory Depot capabilities`);
    console.log(`   Permissions added: ${addedCount}`);
    console.log(`   Menus added: ${addedMenuCount}`);
    console.log(`\n📝 Note: Users with Inventory Factory role must log out and back in`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

syncPermissions();
