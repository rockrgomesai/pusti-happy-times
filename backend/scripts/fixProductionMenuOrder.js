/**
 * Fix Production Menu m_order values
 * Changes from Int32 to Decimal (6.0 for Production, 6.1 for Send to Store)
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixMenuOrder() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // 1. Update Production parent menu m_order to 6.0
    const productionMenu = await db.collection("sidebar_menu_items").findOne({
      label: "Production",
      parent_id: null,
    });

    if (productionMenu) {
      await db.collection("sidebar_menu_items").updateOne(
        { _id: productionMenu._id },
        { $set: { m_order: 6.0 } }
      );
      console.log(`✅ Updated Production menu m_order: 60 → 6.0`);
    } else {
      console.log("⚠️  Production menu not found");
    }

    // 2. Update Send to Store submenu m_order to 6.1
    const sendToStoreMenu = await db.collection("sidebar_menu_items").findOne({
      label: "Send to Store",
      parent_id: productionMenu?._id,
    });

    if (sendToStoreMenu) {
      await db.collection("sidebar_menu_items").updateOne(
        { _id: sendToStoreMenu._id },
        { $set: { m_order: 6.1 } }
      );
      console.log(`✅ Updated Send to Store menu m_order: 1 → 6.1`);
    } else {
      console.log("⚠️  Send to Store menu not found");
    }

    // 3. Verify the updates
    console.log("\n📋 Verifying updated values:");
    const verifyProduction = await db.collection("sidebar_menu_items").findOne({
      label: "Production",
      parent_id: null,
    });
    const verifySendToStore = await db.collection("sidebar_menu_items").findOne({
      label: "Send to Store",
      parent_id: productionMenu?._id,
    });

    if (verifyProduction) {
      console.log(`   Production: m_order = ${verifyProduction.m_order} (type: ${typeof verifyProduction.m_order})`);
    }
    if (verifySendToStore) {
      console.log(`   Send to Store: m_order = ${verifySendToStore.m_order} (type: ${typeof verifySendToStore.m_order})`);
    }

    console.log("\n✅ ===== FIX COMPLETE =====");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

fixMenuOrder();
