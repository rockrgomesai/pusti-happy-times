const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkChalanSetup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Check menu items
    console.log("=== MENU ITEMS ===");
    const menus = await db
      .collection("sidebarmenuitems")
      .find({ href: { $regex: "chalan" } })
      .toArray();
    console.log("Chalan menu items:", menus.length);
    if (menus.length > 0) {
      menus.forEach((m) => console.log(`  - ${m.label}: ${m.href}`));
    } else {
      console.log("  No menu items found");
    }

    // Check permissions
    console.log("\n=== API PERMISSIONS ===");
    const perms = await db
      .collection("apipermissions")
      .find({ key: { $regex: "chalan" } })
      .toArray();
    console.log("Chalan permissions:", perms.length);
    if (perms.length > 0) {
      perms.forEach((p) => console.log(`  - ${p.key}: ${p.description}`));
    } else {
      console.log("  No permissions found");
    }

    // Check role permissions for Inventory Depot role
    console.log("\n=== ROLE PERMISSIONS (Inventory Depot) ===");
    const inventoryDepotRole = await db.collection("roles").findOne({ name: "Inventory Depot" });
    if (inventoryDepotRole) {
      console.log("Inventory Depot Role ID:", inventoryDepotRole._id);
      const rolePerms = await db
        .collection("roleapipermissions")
        .find({ role_id: inventoryDepotRole._id })
        .toArray();

      // Get permission details
      const permIds = rolePerms.map((rp) => rp.api_permission_id);
      const permDetails = await db
        .collection("apipermissions")
        .find({ _id: { $in: permIds }, key: { $regex: "chalan" } })
        .toArray();

      console.log("Chalan permissions assigned:", permDetails.length);
      permDetails.forEach((p) => console.log(`  - ${p.key}: ${p.description}`));
    } else {
      console.log("Inventory Depot role not found");
    }

    // Check existing chalans
    console.log("\n=== EXISTING CHALANS ===");
    const chalanCount = await db.collection("deliverychalans").countDocuments();
    console.log("Total chalans in database:", chalanCount);

    if (chalanCount > 0) {
      const recentChalans = await db
        .collection("deliverychalans")
        .find()
        .sort({ chalan_date: -1 })
        .limit(3)
        .toArray();
      console.log("\nRecent chalans:");
      recentChalans.forEach((c) => {
        console.log(`  - ${c.chalan_no} (${c.status}) - ${c.chalan_date}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkChalanSetup();
