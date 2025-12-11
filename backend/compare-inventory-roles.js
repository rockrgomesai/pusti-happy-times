/**
 * Compare Inventory Factory vs Inventory Depot permissions
 * Ensure Inventory Factory has ALL Inventory Depot permissions + production receiving
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function compareRoles() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");
    const RoleApiPermission = mongoose.model("RoleApiPermission", new mongoose.Schema({}, { strict: false, strictPopulate: false }), "role_api_permissions");
    const ApiPermission = mongoose.model("ApiPermission", new mongoose.Schema({}, { strict: false }), "api_permissions");
    const RoleMenuItems = mongoose.model("RoleMenuItems", new mongoose.Schema({}, { strict: false, strictPopulate: false }), "role_menu_items");
    const SidebarMenuItem = mongoose.model("SidebarMenuItem", new mongoose.Schema({}, { strict: false }), "sidebar_menu_items");

    // Find both roles
    const depotRole = await Role.findOne({ role: "Inventory Depot" }).lean();
    const factoryRole = await Role.findOne({ role: "Inventory Factory" }).lean();

    if (!depotRole) {
      console.log("❌ Inventory Depot role not found!");
      process.exit(1);
    }

    if (!factoryRole) {
      console.log("❌ Inventory Factory role not found!");
      process.exit(1);
    }

    console.log("=== ROLES FOUND ===");
    console.log(`Inventory Depot: ${depotRole._id}`);
    console.log(`Inventory Factory: ${factoryRole._id}\n`);

    // Get permissions from junction table
    const db = mongoose.connection.db;
    
    const depotRolePerms = await db.collection("role_api_permissions")
      .find({ role_id: depotRole._id })
      .toArray();
    
    const factoryRolePerms = await db.collection("role_api_permissions")
      .find({ role_id: factoryRole._id })
      .toArray();

    // Get permission details
    const depotPermIds = depotRolePerms.map((p) => p.api_permission_id);
    const factoryPermIds = factoryRolePerms.map((p) => p.api_permission_id);

    const depotPermDocs = await ApiPermission.find({ _id: { $in: depotPermIds } }).lean();
    const factoryPermDocs = await ApiPermission.find({ _id: { $in: factoryPermIds } }).lean();

    const depotPermCodes = depotPermDocs
      .map((p) => p.api_permissions)
      .filter(Boolean)
      .sort();

    const factoryPermCodes = factoryPermDocs
      .map((p) => p.api_permissions)
      .filter(Boolean)
      .sort();

    console.log(`=== INVENTORY DEPOT PERMISSIONS (${depotPermCodes.length}) ===`);
    depotPermCodes.forEach((p) => console.log(`  ✓ ${p}`));

    console.log(`\n=== INVENTORY FACTORY PERMISSIONS (${factoryPermCodes.length}) ===`);
    factoryPermCodes.forEach((p) => console.log(`  ✓ ${p}`));

    // Find missing permissions in Factory
    const missingInFactory = depotPermCodes.filter((p) => !factoryPermCodes.includes(p));

    console.log(`\n=== MISSING IN INVENTORY FACTORY (${missingInFactory.length}) ===`);
    if (missingInFactory.length === 0) {
      console.log("  ✅ None - Inventory Factory has all Depot permissions");
    } else {
      missingInFactory.forEach((p) => console.log(`  ❌ ${p}`));
    }

    // Get menu items for both roles from junction table
    const depotMenus = await db.collection("role_sidebar_menu_items")
      .find({ role_id: depotRole._id })
      .toArray();
    
    const factoryMenus = await db.collection("role_sidebar_menu_items")
      .find({ role_id: factoryRole._id })
      .toArray();

    const depotMenuIds = depotMenus.map((m) => m.sidebar_menu_item_id);
    const factoryMenuIds = factoryMenus.map((m) => m.sidebar_menu_item_id);

    const depotMenuDocs = await SidebarMenuItem.find({ _id: { $in: depotMenuIds } }).lean();
    const factoryMenuDocs = await SidebarMenuItem.find({ _id: { $in: factoryMenuIds } }).lean();

    const depotMenuLabels = depotMenuDocs
      .map((m) => m.label)
      .filter(Boolean)
      .sort();

    const factoryMenuLabels = factoryMenuDocs
      .map((m) => m.label)
      .filter(Boolean)
      .sort();

    console.log(`\n=== INVENTORY DEPOT MENUS (${depotMenuLabels.length}) ===`);
    depotMenuLabels.forEach((m) => console.log(`  📋 ${m}`));

    console.log(`\n=== INVENTORY FACTORY MENUS (${factoryMenuLabels.length}) ===`);
    factoryMenuLabels.forEach((m) => console.log(`  📋 ${m}`));

    // Find missing menus in Factory
    const missingMenusInFactory = depotMenuLabels.filter((m) => !factoryMenuLabels.includes(m));

    console.log(`\n=== MISSING MENUS IN INVENTORY FACTORY (${missingMenusInFactory.length}) ===`);
    if (missingMenusInFactory.length === 0) {
      console.log("  ✅ None - Inventory Factory has all Depot menus");
    } else {
      missingMenusInFactory.forEach((m) => console.log(`  ❌ ${m}`));
    }

    // Summary
    console.log("\n=== SUMMARY ===");
    console.log(`Total permissions to copy: ${missingInFactory.length}`);
    console.log(`Total menus to copy: ${missingMenusInFactory.length}`);

    if (missingInFactory.length > 0 || missingMenusInFactory.length > 0) {
      console.log("\n⚠️  Inventory Factory is MISSING functionalities from Inventory Depot!");
      console.log("    Run: node sync-inventory-factory-permissions.js");
    } else {
      console.log("\n✅ Inventory Factory has ALL Inventory Depot functionalities!");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

compareRoles();
