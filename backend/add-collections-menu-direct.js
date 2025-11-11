/**
 * Add Collections Menu Item - Direct DB Insert
 */

const mongoose = require("mongoose");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addCollectionsMenuDirect() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // 1. Find Order Management parent
    console.log("📋 Looking for Order Management parent menu...");
    const parentMenu = await db.collection("sidebar_menu_items").findOne({
      label: "Order Management",
      is_submenu: false,
    });

    if (!parentMenu) {
      console.log("   ❌ Order Management parent not found!");
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`   ✅ Found parent: Order Management (${parentMenu._id})`);

    // 2. Check if Payments menu already exists
    console.log("\n📋 Checking for Payments menu...");
    let collectionsMenu = await db.collection("sidebar_menu_items").findOne({
      $or: [
        { label: "Collections", parent_id: parentMenu._id },
        { label: "Payments", parent_id: parentMenu._id },
      ],
    });

    if (collectionsMenu) {
      console.log(`   ✅ Menu already exists: ${collectionsMenu.label} (${collectionsMenu._id})`);
      // Update label if it's still "Collections"
      if (collectionsMenu.label === "Collections") {
        await db
          .collection("sidebar_menu_items")
          .updateOne({ _id: collectionsMenu._id }, { $set: { label: "Payments" } });
        console.log(`   ✅ Updated label from "Collections" to "Payments"`);
      }
    } else {
      console.log("   Creating Payments menu...");

      const result = await db.collection("sidebar_menu_items").insertOne({
        label: "Payments",
        href: "/ordermanagement/collections",
        icon: "FaMoneyBillWave",
        parent_id: parentMenu._id,
        is_submenu: true,
        m_order: 2,
      });

      collectionsMenu = { _id: result.insertedId };
      console.log(`   ✅ Created: Payments (${collectionsMenu._id})`);
    }

    // 3. Assign to Distributor role
    console.log("\n📋 Assigning to Distributor role...");
    const distributorRole = await db.collection("roles").findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.log("   ❌ Distributor role not found!");
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`   Found: Distributor (${distributorRole._id})`);

    // Check if parent is assigned
    const parentAssignment = await db.collection("role_sidebar_menu_items").findOne({
      role_id: distributorRole._id,
      sidebar_menu_item_id: parentMenu._id,
    });

    if (!parentAssignment) {
      try {
        await db.collection("role_sidebar_menu_items").insertOne({
          role_id: distributorRole._id,
          sidebar_menu_item_id: parentMenu._id,
        });
        console.log("   ✅ Assigned parent menu to Distributor");
      } catch (error) {
        if (error.code === 11000) {
          console.log("   ✅ Parent already assigned (duplicate caught)");
        } else {
          throw error;
        }
      }
    } else {
      console.log("   ✅ Parent already assigned");
    }

    // Check if Payments menu is assigned
    const collectionsAssignment = await db.collection("role_sidebar_menu_items").findOne({
      role_id: distributorRole._id,
      sidebar_menu_item_id: collectionsMenu._id,
    });

    if (!collectionsAssignment) {
      await db.collection("role_sidebar_menu_items").insertOne({
        role_id: distributorRole._id,
        sidebar_menu_item_id: collectionsMenu._id,
      });
      console.log("   ✅ Assigned Payments to Distributor");
    } else {
      console.log("   ✅ Payments already assigned");
    }

    console.log("\n✨ Payments menu setup complete!");
    console.log("\n⚠️  Note: Users need to logout and login again to see the updated menu item.");

    await mongoose.connection.close();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

addCollectionsMenuDirect();
