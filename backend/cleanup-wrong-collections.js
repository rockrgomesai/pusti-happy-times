/**
 * Simple Cleanup - Delete Incorrect Collections
 * The data is already in the correct collections or the wrong schema
 */

const mongoose = require("mongoose");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function cleanup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    console.log("🔍 Checking if Collections menu already exists in correct collection...");
    const collectionsMenu = await db.collection("sidebar_menu_items").findOne({
      label: "Collections",
      href: "/ordermanagement/collections",
    });

    if (collectionsMenu) {
      console.log("   ✅ Collections menu already exists in sidebar_menu_items");
      console.log(`      ID: ${collectionsMenu._id}`);
    } else {
      console.log("   ❌ Collections menu NOT found in sidebar_menu_items");
      console.log("   ℹ️  You may need to add it manually");
    }

    // Just drop the incorrect collections
    console.log("\n🗑️  Dropping incorrect collections...");

    const collectionsToDelete = [
      "sidebarmenuitems",
      "rolesidebarmenuitems",
      "roleapipermissions",
      "apipermissions",
    ];

    for (const collName of collectionsToDelete) {
      try {
        const count = await db.collection(collName).countDocuments();
        if (count > 0) {
          console.log(`\n   Dropping ${collName} (${count} documents)...`);
          await db.collection(collName).drop();
          console.log(`   ✅ Dropped: ${collName}`);
        }
      } catch (error) {
        if (error.message.includes("ns not found")) {
          console.log(`   ⏭️  Already deleted: ${collName}`);
        } else {
          console.log(`   ❌ Error dropping ${collName}: ${error.message}`);
        }
      }
    }

    console.log("\n✨ Cleanup complete!");

    // Final verification
    console.log("\n📊 Remaining collections:");
    const allCollections = await db.listCollections().toArray();
    const remaining = allCollections.filter((c) =>
      collectionsToDelete.some((wrong) => c.name.toLowerCase().includes(wrong.toLowerCase()))
    );

    if (remaining.length === 0) {
      console.log("   ✅ No incorrect collections found");
    } else {
      console.log("   ⚠️  Still found:");
      remaining.forEach((c) => console.log(`      - ${c.name}`));
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

cleanup();
