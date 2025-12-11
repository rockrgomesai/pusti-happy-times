/**
 * Fix Inventory Depot role - Add Load Sheet permissions and menu
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

async function fixInventoryDepot() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

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
    const RoleMenuItems = mongoose.model(
      "RoleMenuItems",
      new mongoose.Schema({}, { strict: false }),
      "role_sidebar_menu_items"
    );

    // Find Inventory Depot role
    const role = await Role.findOne({ role: "Inventory Depot" });

    if (!role) {
      console.log("❌ Inventory Depot role not found!");
      process.exit(1);
    }

    console.log("=== FIXING INVENTORY DEPOT ROLE ===");
    console.log(`Role ID: ${role._id}\n`);

    // Required Load Sheet permissions
    const requiredPermissions = [
      { code: "load-sheet:create", description: "Create Load Sheets" },
      { code: "load-sheet:read", description: "View Load Sheet details" },
      { code: "load-sheet:list", description: "List Load Sheets" },
      { code: "load-sheet:edit", description: "Edit Load Sheets" },
      { code: "load-sheet:delete", description: "Delete Load Sheets" },
      { code: "load-sheet:convert", description: "Convert Load Sheets to Chalans" },
    ];

    console.log("📝 Adding API Permissions...\n");

    if (!role.api_permissions) {
      role.api_permissions = [];
    }

    for (const perm of requiredPermissions) {
      // Find or create permission
      let permission = await ApiPermission.findOne({ code: perm.code });

      if (!permission) {
        console.log(`  Creating ${perm.code}...`);
        permission = await ApiPermission.create({
          code: perm.code,
          description: perm.description,
          module: "Inventory",
          active: true,
        });
        console.log(`  ✓ Created ${perm.code}`);
      } else {
        console.log(`  ✓ ${perm.code} exists`);
      }

      // Add to role if not already there
      const hasPermission = role.api_permissions.some(
        (p) => p.toString() === permission._id.toString()
      );

      if (!hasPermission) {
        role.api_permissions.push(permission._id);
        console.log(`  ➕ Added ${perm.code} to role`);
      } else {
        console.log(`  ✓ Role already has ${perm.code}`);
      }
    }

    await role.save();
    console.log("\n✅ Permissions updated\n");

    // Add Load Sheets menu
    console.log("📋 Adding Load Sheets Menu...\n");

    let loadSheetMenu = await SidebarMenuItem.findOne({
      $or: [
        { href: "/inventory/load-sheets" },
        { label: "Load Sheets" }
      ]
    });

    if (!loadSheetMenu) {
      console.log("  Creating Load Sheets menu item...");
      
      // Get highest order
      const allMenus = await SidebarMenuItem.find({}).sort({ m_order: -1 });
      const maxOrder = allMenus.length > 0 ? allMenus[0].m_order || 0 : 0;

      loadSheetMenu = await SidebarMenuItem.create({
        label: "Load Sheets",
        icon: "LocalShipping",
        href: "/inventory/load-sheets",
        parent_id: null,
        m_order: maxOrder + 1,
        is_submenu: false,
      });
      console.log("  ✓ Created Load Sheets menu");
    } else {
      console.log("  ✓ Load Sheets menu exists");
    }

    // Link menu to role
    const roleMenuLink = await RoleMenuItems.findOne({
      role_id: role._id,
      sidebar_menu_item_id: loadSheetMenu._id,
    });

    if (!roleMenuLink) {
      await RoleMenuItems.create({
        role_id: role._id,
        sidebar_menu_item_id: loadSheetMenu._id,
      });
      console.log("  ➕ Linked Load Sheets menu to Inventory Depot role");
    } else {
      console.log("  ✓ Menu already linked to role");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ INVENTORY DEPOT ROLE FIXED!");
    console.log("=".repeat(60));
    console.log("\n📌 Users with Inventory Depot role can now:");
    console.log("  • See 'Load Sheets' in sidebar menu");
    console.log("  • Create Load Sheets from approved DOs");
    console.log("  • View, Edit, Delete Load Sheets");
    console.log("  • Convert Load Sheets to Chalans & Invoices");
    console.log("\n⚠️  Users must log out and log back in to see changes\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixInventoryDepot();
