/**
 * Verify Production User Complete Setup
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function verifySetup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // 1. Check User
    const user = await db.collection("users").findOne({ username: "productionmanagerorange" });
    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    // 2. Check Role
    const role = await db.collection("roles").findOne({ _id: user.role_id });
    console.log("👤 User: productionmanagerorange");
    console.log("   Role:", role?.role);

    // 3. Check Employee
    const employee = await db.collection("employees").findOne({ _id: user.employee_id });
    console.log("\n📋 Employee:");
    console.log("   Name:", employee?.name);
    console.log("   Facility ID:", employee?.facility_id ? "✅ Set" : "❌ Missing");
    console.log("   Factory Store ID:", employee?.factory_store_id ? "✅ Set" : "❌ Missing");

    // 4. Check Permissions
    const rolePermissions = await db
      .collection("role_api_permissions")
      .find({ role_id: role._id })
      .toArray();

    const permissionIds = rolePermissions.map((rp) => rp.api_permission_id);
    const permissions = await db
      .collection("api_permissions")
      .find({ _id: { $in: permissionIds } })
      .toArray();

    console.log("\n🔐 API Permissions:");
    const hasProductsRead = permissions.some((p) => p.api_permissions === "products:read");
    const hasSendToStore = permissions.some(
      (p) => p.api_permissions && p.api_permissions.includes("send-to-store")
    );

    console.log("   products:read:", hasProductsRead ? "✅" : "❌ Missing");
    console.log("   send-to-store permissions:", hasSendToStore ? "✅" : "❌ Missing");

    // 5. Check Menu Items
    const roleMenus = await db
      .collection("role_sidebar_menu_items")
      .find({ role_id: role._id })
      .toArray();

    const menuIds = roleMenus.map((rm) => rm.sidebar_menu_item_id);
    const menus = await db
      .collection("sidebar_menu_items")
      .find({ _id: { $in: menuIds } })
      .toArray();

    console.log("\n📱 Menu Items:");
    const hasProduction = menus.some((m) => m.label === "Production");
    const hasSendToStoreMenu = menus.some((m) => m.label === "Send to Store");

    console.log("   Production menu:", hasProduction ? "✅" : "❌ Missing");
    console.log("   Send to Store menu:", hasSendToStoreMenu ? "✅" : "❌ Missing");

    // 6. Final Status
    console.log("\n" + "=".repeat(50));
    const isComplete =
      employee?.facility_id &&
      employee?.factory_store_id &&
      hasProductsRead &&
      hasProduction &&
      hasSendToStoreMenu;

    if (isComplete) {
      console.log("✅ SETUP COMPLETE!");
      console.log("\n⚠️  IMPORTANT: User must log out and log back in");
      console.log("    to get a new JWT token with updated permissions.");
    } else {
      console.log("⚠️  SETUP INCOMPLETE - Some items need attention");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

verifySetup();
