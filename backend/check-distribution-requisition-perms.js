/**
 * Check if Distribution role has requisition-scheduling permissions
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkDistributionRequisitionPerms() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find Distribution role
    const distRole = await db.collection("roles").findOne({ role: "Distribution" });

    if (!distRole) {
      console.log("❌ Distribution role not found!");
      process.exit(1);
    }

    console.log("=== DISTRIBUTION ROLE ===");
    console.log(`ID: ${distRole._id}`);
    console.log(`Name: ${distRole.role}\n`);

    // Get all permissions for Distribution role
    const rolePerms = await db.collection("role_api_permissions")
      .find({ role_id: distRole._id })
      .toArray();

    const permIds = rolePerms.map(p => p.api_permission_id);
    const permissions = await db.collection("api_permissions")
      .find({ _id: { $in: permIds } })
      .toArray();

    const permCodes = permissions.map(p => p.api_permissions).sort();

    console.log(`=== DISTRIBUTION PERMISSIONS (${permCodes.length}) ===`);
    permCodes.forEach(p => console.log(`  ✓ ${p}`));

    // Check for requisition-scheduling permissions
    const requisitionPerms = permCodes.filter(p => p.includes("requisition"));

    console.log(`\n=== REQUISITION PERMISSIONS (${requisitionPerms.length}) ===`);
    if (requisitionPerms.length === 0) {
      console.log("  ❌ NONE FOUND!");
      console.log("\n⚠️  Distribution role is missing requisition-scheduling permissions!");
    } else {
      requisitionPerms.forEach(p => console.log(`  ✓ ${p}`));
    }

    // Check what permissions are needed
    console.log("\n=== REQUIRED PERMISSIONS ===");
    const required = [
      "requisition-scheduling:read",
      "requisition-scheduling:create", 
      "requisition-scheduling:edit",
      "requisition-scheduling:delete"
    ];

    const missing = required.filter(r => !permCodes.includes(r));

    if (missing.length > 0) {
      console.log("Missing permissions:");
      missing.forEach(p => console.log(`  ❌ ${p}`));
    } else {
      console.log("  ✅ All required permissions present");
    }

    // Check menu items
    console.log("\n=== DISTRIBUTION MENUS ===");
    const roleMenus = await db.collection("role_sidebar_menu_items")
      .find({ role_id: distRole._id })
      .toArray();

    const menuIds = roleMenus.map(m => m.sidebar_menu_item_id);
    const menus = await db.collection("sidebar_menu_items")
      .find({ _id: { $in: menuIds } })
      .toArray();

    const menuLabels = menus.map(m => m.label).sort();
    menuLabels.forEach(m => console.log(`  📋 ${m}`));

    const requisitionMenus = menus.filter(m => 
      m.label?.toLowerCase().includes("requisition") || 
      m.href?.includes("requisition")
    );

    console.log(`\n=== REQUISITION MENUS (${requisitionMenus.length}) ===`);
    if (requisitionMenus.length === 0) {
      console.log("  ❌ NONE FOUND!");
      console.log("\n⚠️  Distribution role has no requisition scheduling menu!");
    } else {
      requisitionMenus.forEach(m => {
        console.log(`  ✓ ${m.label} (${m.href})`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDistributionRequisitionPerms();
