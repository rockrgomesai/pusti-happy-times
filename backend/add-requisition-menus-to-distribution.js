/**
 * PRODUCTION - Check user 450's menus and add requisition scheduling menus
 * Run on VPS: node add-requisition-menus-to-distribution.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function addRequisitionMenus() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to PRODUCTION\n");

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

    // Check current menus
    const currentMenus = await db
      .collection("role_sidebar_menu_items")
      .find({ role_id: distRole._id })
      .toArray();

    const menuIds = currentMenus.map((m) => m.sidebar_menu_item_id);
    const menuDocs = await db
      .collection("sidebar_menu_items")
      .find({ _id: { $in: menuIds } })
      .toArray();

    console.log(`=== CURRENT MENUS (${menuDocs.length}) ===`);
    menuDocs.forEach((m) => console.log(`  📋 ${m.label} (${m.href})`));

    // Check if requisition menus exist
    const requisitionMenus = menuDocs.filter(
      (m) => m.href?.includes("requisition") || m.label?.toLowerCase().includes("requisition")
    );

    console.log(`\n=== REQUISITION MENUS (${requisitionMenus.length}) ===`);
    if (requisitionMenus.length > 0) {
      requisitionMenus.forEach((m) => console.log(`  ✓ ${m.label} (${m.href})`));
      console.log("\n✅ Requisition menus already exist!");
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log("  ❌ NONE FOUND! Adding now...\n");

    // Find or create the requisition scheduling menus
    const menusToAdd = [
      {
        label: "Schedule Requisitions",
        href: "/inventory/schedule-requisitions",
        icon: "ScheduleIcon",
        parent_id: null,
        order: 40,
      },
      {
        label: "Req. Scheduled List",
        href: "/inventory/requisition-scheduled-list",
        icon: "ListAltIcon",
        parent_id: null,
        order: 41,
      },
    ];

    for (const menuData of menusToAdd) {
      // Check if menu exists
      let menu = await db.collection("sidebar_menu_items").findOne({
        href: menuData.href,
      });

      if (!menu) {
        // Create menu item
        const result = await db.collection("sidebar_menu_items").insertOne({
          ...menuData,
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
        menu = { _id: result.insertedId, ...menuData };
        console.log(`  ✅ Created menu: ${menuData.label}`);
      } else {
        console.log(`  ✓ Menu exists: ${menuData.label}`);
      }

      // Link to Distribution role
      const existingLink = await db.collection("role_sidebar_menu_items").findOne({
        role_id: distRole._id,
        sidebar_menu_item_id: menu._id,
      });

      if (!existingLink) {
        await db.collection("role_sidebar_menu_items").insertOne({
          role_id: distRole._id,
          sidebar_menu_item_id: menu._id,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`    → Linked to Distribution role`);
      } else {
        console.log(`    → Already linked`);
      }
    }

    console.log("\n✅ Requisition menus added to Distribution role!");
    console.log("\n📝 User 450 must log out and back in to see new menus\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addRequisitionMenus();
