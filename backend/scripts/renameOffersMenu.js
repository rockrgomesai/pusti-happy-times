/**
 * Rename "Offers" menu item to "Primary Offers"
 * Run with: node backend/scripts/renameOffersMenu.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const { SidebarMenuItem } = require("../src/models");

async function renameOffersMenu() {
  try {
    console.log("🔄 Connecting to database...");
    await connectDB();

    console.log('📝 Updating "Offers" menu to "Primary Offers"...');

    const result = await SidebarMenuItem.updateOne(
      { label: "Offers" },
      { $set: { label: "Primary Offers" } }
    );

    if (result.matchedCount === 0) {
      console.log('⚠️  No menu item found with label "Offers"');
    } else if (result.modifiedCount === 0) {
      console.log("ℹ️  Menu item already has the correct label");
    } else {
      console.log('✅ Successfully renamed "Offers" to "Primary Offers"');
    }

    // Verify the change
    const updatedMenu = await SidebarMenuItem.findOne({ label: "Primary Offers" });
    if (updatedMenu) {
      console.log('✓ Verified: Menu item found with label "Primary Offers"');
      console.log(`  ID: ${updatedMenu._id}`);
      console.log(`  Href: ${updatedMenu.href}`);
      console.log(`  Icon: ${updatedMenu.icon}`);
    }
  } catch (error) {
    console.error("❌ Error renaming menu:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Done");
    process.exit(0);
  }
}

renameOffersMenu();
