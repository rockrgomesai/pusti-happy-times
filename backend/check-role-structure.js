/**
 * Direct MongoDB query to check role permissions structure
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkStructure() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Check Inventory Depot role
    const depotRole = await db.collection("roles").findOne({ role: "Inventory Depot" });
    console.log("=== INVENTORY DEPOT ROLE ===");
    console.log(JSON.stringify(depotRole, null, 2));

    // Check Inventory Factory role
    const factoryRole = await db.collection("roles").findOne({ role: "Inventory Factory" });
    console.log("\n=== INVENTORY FACTORY ROLE ===");
    console.log(JSON.stringify(factoryRole, null, 2));

    // Check if there's a junction table
    const rolePermissions = await db.collection("role_api_permissions")
      .find({ role_id: depotRole._id })
      .limit(5)
      .toArray();
    console.log("\n=== ROLE_API_PERMISSIONS (sample) ===");
    console.log(JSON.stringify(rolePermissions, null, 2));

    // Check menu items
    const roleMenus = await db.collection("role_sidebar_menu_items")
      .find({ role_id: depotRole._id })
      .limit(5)
      .toArray();
    console.log("\n=== ROLE_SIDEBAR_MENU_ITEMS (sample) ===");
    console.log(JSON.stringify(roleMenus, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkStructure();
