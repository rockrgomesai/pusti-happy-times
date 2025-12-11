/**
 * Check permissions for user 103 (Inventory Depot role)
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkUser103() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 Using URI:", MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@"));
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");
    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );
    const SidebarMenuItem = mongoose.model(
      "SidebarMenuItem",
      new mongoose.Schema({}, { strict: false }),
      "sidebar_menu_items"
    );

    // Find user 103
    const user = await User.findOne({ username: "103" }).lean();

    if (!user) {
      console.log("❌ User 103 not found");
      process.exit(1);
    }

    console.log("=== USER 103 INFO ===");
    console.log(`Username: ${user.username}`);
    console.log(`Full Name: ${user.full_name}`);
    console.log(`Role ID: ${user.role_id}`);
    console.log(`Facility ID: ${user.facility_id || "Not set"}\n`);

    // Find their role
    const role = await Role.findById(user.role_id).lean();

    if (!role) {
      console.log("❌ Role not found for user");
      process.exit(1);
    }

    console.log("=== ROLE INFO ===");
    console.log(`Role: ${role.role}`);
    console.log(`Name: ${role.name}\n`);

    // Get API permissions
    const permissionIds = role.api_permissions || [];
    const permissions = await ApiPermission.find({ _id: { $in: permissionIds } })
      .select("code description")
      .lean();

    console.log(`=== API PERMISSIONS (${permissions.length}) ===`);

    const loadSheetPerms = permissions.filter((p) => p.code && p.code.includes("load-sheet"));
    console.log("\nLoad Sheet Permissions:");
    if (loadSheetPerms.length === 0) {
      console.log("  ❌ NO LOAD SHEET PERMISSIONS FOUND!");
    } else {
      loadSheetPerms.forEach((p) => console.log(`  ✓ ${p.code}`));
    }

    // Check for all required load sheet permissions
    const requiredPerms = [
      "load-sheet:create",
      "load-sheet:read",
      "load-sheet:list",
      "load-sheet:edit",
      "load-sheet:delete",
      "load-sheet:convert",
    ];

    console.log("\nRequired Permissions Check:");
    requiredPerms.forEach((perm) => {
      const has = permissions.some((p) => p.code === perm);
      console.log(`  ${has ? "✓" : "❌"} ${perm}`);
    });

    // Check sidebar menu
    const RoleMenuItems = mongoose.model(
      "RoleMenuItems",
      new mongoose.Schema({}, { strict: false, strictPopulate: false }),
      "role_sidebar_menu_items"
    );

    const menuLinks = await RoleMenuItems.find({ role_id: role._id })
      .populate("sidebar_menu_item_id")
      .lean();

    console.log(`\n=== SIDEBAR MENU (${menuLinks.length} items) ===`);
    const loadSheetMenu = menuLinks.find((link) => {
      const menu = link.sidebar_menu_item_id;
      return (
        menu && (menu.label === "Load Sheets" || (menu.href && menu.href.includes("load-sheet")))
      );
    });

    if (loadSheetMenu) {
      console.log("✓ Has Load Sheets menu access");
      console.log(`  Label: ${loadSheetMenu.sidebar_menu_item_id.label}`);
      console.log(`  Href: ${loadSheetMenu.sidebar_menu_item_id.href}`);
    } else {
      console.log("❌ NO LOAD SHEETS MENU ACCESS!");
    }

    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY:");
    console.log("=".repeat(60));

    if (loadSheetPerms.length === 0) {
      console.log("⚠️  User 103 CANNOT create Load Sheets - missing permissions");
    }

    if (!loadSheetMenu) {
      console.log("⚠️  User 103 CANNOT see Load Sheets menu");
    }

    if (loadSheetPerms.length > 0 && loadSheetMenu) {
      console.log("✅ User 103 has Load Sheets access");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUser103();
