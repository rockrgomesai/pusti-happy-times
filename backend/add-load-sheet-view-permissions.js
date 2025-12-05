require("dotenv").config();
const mongoose = require("mongoose");

async function addLoadSheetPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

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

    const role = await Role.findOne({ role: "Inventory Depot" });
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    // Permissions needed for viewing load sheets
    const permissionsToAdd = ["load-sheet:read", "load-sheet:list"];

    console.log("Adding load sheet view permissions...\n");

    for (const permName of permissionsToAdd) {
      let permission = await ApiPermission.findOne({ api_permissions: permName });

      if (!permission) {
        console.log(`Creating ${permName}...`);
        permission = await ApiPermission.create({
          api_permissions: permName,
        });
      }

      const hasPermission = role.api_permission_ids?.some(
        (id) => id.toString() === permission._id.toString()
      );

      if (!hasPermission) {
        if (!role.api_permission_ids) {
          role.api_permission_ids = [];
        }
        role.api_permission_ids.push(permission._id);
        console.log(`✓ Added ${permName}`);
      } else {
        console.log(`  Already has ${permName}`);
      }
    }

    await role.save();

    // Add Load Sheets menu item if not exists
    console.log("\nChecking Load Sheets menu item...");

    const loadSheetMenu = await SidebarMenuItem.findOne({
      name: "Load Sheets",
      href: "/distribution/load-sheets",
    });

    if (loadSheetMenu) {
      // Check if role already has this menu
      const hasMenu = loadSheetMenu.role_ids?.some((id) => id.toString() === role._id.toString());

      if (!hasMenu) {
        if (!loadSheetMenu.role_ids) {
          loadSheetMenu.role_ids = [];
        }
        loadSheetMenu.role_ids.push(role._id);
        await loadSheetMenu.save();
        console.log("✓ Added Load Sheets menu to Inventory Depot role");
      } else {
        console.log("  Already has Load Sheets menu");
      }
    } else {
      console.log("⚠️  Load Sheets menu item not found - may need to be created");
    }

    console.log("\n✅ Done!");
    console.log("Please log out and log back in for changes to take effect.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addLoadSheetPermissions();
