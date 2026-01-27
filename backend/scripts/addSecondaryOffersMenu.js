/**
 * Add "Secondary Offers" menu item as sibling to "Primary Offers"
 * Run with: node backend/scripts/addSecondaryOffersMenu.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../src/config/database");
const { SidebarMenuItem } = require("../src/models");
const { RoleSidebarMenuItem } = require("../src/models/JunctionTables");

async function addSecondaryOffersMenu() {
  try {
    console.log("🔄 Connecting to database...");
    await connectDB();

    // Find Primary Offers menu to get its parent and order
    const primaryOffers = await SidebarMenuItem.findOne({ label: "Primary Offers" });

    if (!primaryOffers) {
      console.log("⚠️  Primary Offers menu not found. Creating both menus...");
      process.exit(1);
    }

    console.log("📍 Found Primary Offers:");
    console.log(`   ID: ${primaryOffers._id}`);
    console.log(`   Parent: ${primaryOffers.parent_id || "null (top level)"}`);
    console.log(`   Order: ${primaryOffers.m_order}`);

    // Check if Secondary Offers already exists
    const existing = await SidebarMenuItem.findOne({ label: "Secondary Offers" });

    if (existing) {
      console.log("ℹ️  Secondary Offers menu already exists");
      console.log(`   ID: ${existing._id}`);
      console.log(`   Href: ${existing.href}`);
      process.exit(0);
    }

    // Create Secondary Offers menu item as sibling (same parent, next order)
    console.log("📝 Creating Secondary Offers menu item...");

    const secondaryOffers = await SidebarMenuItem.create({
      label: "Secondary Offers",
      href: "/product/secondaryoffers",
      m_order: primaryOffers.m_order + 0.1, // Place it right after Primary Offers
      icon: "FaBrowseOffers", // Different icon
      parent_id: primaryOffers.parent_id, // Same parent (sibling)
      is_submenu: primaryOffers.is_submenu,
      created_by: "system",
      updated_by: "system",
    });

    console.log("✅ Created Secondary Offers menu item:");
    console.log(`   ID: ${secondaryOffers._id}`);
    console.log(`   Href: ${secondaryOffers.href}`);
    console.log(`   Order: ${secondaryOffers.m_order}`);
    console.log(`   Parent: ${secondaryOffers.parent_id || "null"}`);

    // Assign to same roles as Primary Offers
    console.log("\n🔐 Assigning menu to roles...");

    const primaryOffersRoles = await RoleSidebarMenuItem.find({
      sidebar_menu_item_id: primaryOffers._id,
    }).populate("role_id");

    if (primaryOffersRoles.length === 0) {
      console.log("⚠️  No roles found for Primary Offers. Skipping role assignment.");
    } else {
      for (const assignment of primaryOffersRoles) {
        const exists = await RoleSidebarMenuItem.findOne({
          role_id: assignment.role_id,
          sidebar_menu_item_id: secondaryOffers._id,
        });

        if (!exists) {
          await RoleSidebarMenuItem.create({
            role_id: assignment.role_id,
            sidebar_menu_item_id: secondaryOffers._id,
          });
          console.log(
            `   ✅ Assigned to role: ${assignment.role_id.role || assignment.role_id._id}`
          );
        }
      }
    }

    console.log("\n✅ Successfully added Secondary Offers menu item!");
  } catch (error) {
    console.error("❌ Error adding menu:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Done");
    process.exit(0);
  }
}

addSecondaryOffersMenu();
