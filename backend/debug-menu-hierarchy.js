// Debug and fix parent menu visibility issue
// This ensures parent menus appear for users when they have child menu permissions

const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function debugMenuHierarchy() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const menuCollection = db.collection("sidebar_menu_items");
    const roleMenuCollection = db.collection("role_sidebar_menu_items");
    const rolesCollection = db.collection("roles");

    // Get SuperAdmin role
    const superAdminRole = await rolesCollection.findOne({ role: "SuperAdmin" });
    if (!superAdminRole) {
      console.log("❌ SuperAdmin role not found");
      return;
    }

    console.log("🔍 Analyzing Distributor Menu Structure for SuperAdmin...\n");

    // Get Distributor parent menu
    const distributorParent = await menuCollection.findOne({
      label: "Distributor",
      parent_id: null,
    });

    if (!distributorParent) {
      console.log("❌ Distributor parent menu not found");
      return;
    }

    console.log("📋 Distributor Parent Menu:");
    console.log(`   ID: ${distributorParent._id}`);
    console.log(`   Label: ${distributorParent.label}`);
    console.log(`   href: ${distributorParent.href}`);
    console.log(`   parent_id: ${distributorParent.parent_id || "null"}`);
    console.log(`   is_submenu: ${distributorParent.is_submenu}\n`);

    // Get all children
    const children = await menuCollection
      .find({
        parent_id: distributorParent._id,
      })
      .toArray();

    console.log("📋 Child Menus:");
    children.forEach((child) => {
      console.log(`   - ${child.label}: ${child.href}`);
      console.log(`     ID: ${child._id}`);
      console.log(`     parent_id: ${child.parent_id}`);
      console.log(`     is_submenu: ${child.is_submenu}\n`);
    });

    // Check SuperAdmin's role assignments
    const roleAssignments = await roleMenuCollection
      .find({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: {
          $in: [distributorParent._id, ...children.map((c) => c._id)],
        },
      })
      .toArray();

    console.log("📋 SuperAdmin Role Assignments:");
    const assignedIds = new Set(roleAssignments.map((a) => a.sidebar_menu_item_id.toString()));

    // Check parent
    const parentAssigned = assignedIds.has(distributorParent._id.toString());
    console.log(
      `   ${parentAssigned ? "✅" : "❌"} Distributor (parent): ${parentAssigned ? "ASSIGNED" : "NOT ASSIGNED"}`
    );

    // Check children
    for (const child of children) {
      const childAssigned = assignedIds.has(child._id.toString());
      console.log(
        `   ${childAssigned ? "✅" : "❌"} ${child.label}: ${childAssigned ? "ASSIGNED" : "NOT ASSIGNED"}`
      );
    }

    // Fix if needed
    console.log("\n🔧 Checking if fixes are needed...\n");

    let fixesApplied = 0;

    // Ensure parent is assigned
    if (!parentAssigned) {
      await roleMenuCollection.insertOne({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: distributorParent._id,
      });
      console.log("✅ Added Distributor parent to SuperAdmin");
      fixesApplied++;
    }

    // Ensure all children are assigned
    for (const child of children) {
      if (!assignedIds.has(child._id.toString())) {
        await roleMenuCollection.insertOne({
          role_id: superAdminRole._id,
          sidebar_menu_item_id: child._id,
        });
        console.log(`✅ Added ${child.label} to SuperAdmin`);
        fixesApplied++;
      }
    }

    if (fixesApplied === 0) {
      console.log("✅ All menu items already properly assigned");
    } else {
      console.log(`\n✅ Applied ${fixesApplied} fixes`);
    }

    // Show what API would return
    console.log("\n" + "═".repeat(60));
    console.log("📋 WHAT THE API SHOULD RETURN (after logout/login):");
    console.log("═".repeat(60));

    const allAssignedMenus = await roleMenuCollection
      .find({
        role_id: superAdminRole._id,
      })
      .toArray();

    const allMenus = await menuCollection
      .find({
        _id: { $in: allAssignedMenus.map((a) => a.sidebar_menu_item_id) },
      })
      .toArray();

    // Find Distributor menus
    const distributorMenus = allMenus.filter(
      (m) =>
        m._id.toString() === distributorParent._id.toString() ||
        m.parent_id?.toString() === distributorParent._id.toString()
    );

    console.log("\nDistributor Menu Structure:");
    const parent = distributorMenus.find((m) => !m.parent_id);
    if (parent) {
      console.log(`● ${parent.label} (${parent.href || "parent"})`);
      console.log(`  _id: ${parent._id}`);
      console.log(`  parent_id: ${parent.parent_id || "null"}`);
      console.log(`  is_submenu: ${parent.is_submenu}`);

      const childMenus = distributorMenus.filter(
        (m) => m.parent_id?.toString() === parent._id.toString()
      );
      childMenus.sort((a, b) => (a.m_order || 0) - (b.m_order || 0));

      childMenus.forEach((child) => {
        console.log(`  └─ ${child.label} (${child.href})`);
        console.log(`     _id: ${child._id}`);
        console.log(`     parent_id: ${child.parent_id}`);
        console.log(`     is_submenu: ${child.is_submenu}`);
      });
    }

    console.log("\n✅ Debug complete!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB\n");
  }
}

debugMenuHierarchy();
