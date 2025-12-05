/**
 * Add Depot Deliveries menu and permissions to Inventory Depot role
 *
 * Usage: node add-depot-deliveries-module.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const models = require("./src/models");

async function addDepotDeliveriesModule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Get Inventory Depot role
    const role = await models.Role.findById("690750354bdacd1e192d1ab3").lean();

    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    console.log("=== ADDING DEPOT DELIVERIES MODULE ===");
    console.log("Role:", role.role_name);
    console.log("ID:", role._id, "\n");

    // 1. Create/find menu item
    console.log("1. Creating menu item...");

    let menuItem = await models.SidebarMenuItem.findOne({
      label: "Depot Deliveries",
      href: "/inventory/depot-deliveries",
    });

    if (!menuItem) {
      menuItem = await models.SidebarMenuItem.create({
        label: "Depot Deliveries",
        href: "/inventory/depot-deliveries",
        icon: "LocalShipping",
        m_order: 15,
        parent_id: null,
        is_submenu: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("   ✓ Created menu item: Depot Deliveries");
    } else {
      console.log("   ⊘ Menu item already exists");
    }

    // 2. Link menu to role
    const existingRoleMenu = await models.RoleSidebarMenuItem.findOne({
      role_id: role._id,
      sidebar_menu_item_id: menuItem._id,
    });

    if (!existingRoleMenu) {
      await models.RoleSidebarMenuItem.create({
        role_id: role._id,
        sidebar_menu_item_id: menuItem._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("   ✓ Linked menu to Inventory Depot role");
    } else {
      console.log("   ⊘ Menu already linked to role");
    }

    // 3. Create/find API permission
    console.log("\n2. Creating API permission...");

    let permission = await models.ApiPermission.findOne({
      api_permissions: "depot-deliveries:read",
    });

    if (!permission) {
      permission = await models.ApiPermission.create({
        api_permissions: "depot-deliveries:read",
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("   ✓ Created permission: depot-deliveries:read");
    } else {
      console.log("   ⊘ Permission already exists");
    }

    // 4. Link permission to role
    const existingRolePerm = await models.RoleApiPermission.findOne({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    if (!existingRolePerm) {
      await models.RoleApiPermission.create({
        role_id: role._id,
        api_permission_id: permission._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("   ✓ Linked permission to Inventory Depot role");
    } else {
      console.log("   ⊘ Permission already linked to role");
    }

    // 5. Verify
    console.log("\n3. Verification...");

    const roleMenus = await models.RoleSidebarMenuItem.find({ role_id: role._id }).countDocuments();
    const rolePerms = await models.RoleApiPermission.find({ role_id: role._id }).countDocuments();

    console.log(`   ✓ Total menu items: ${roleMenus}`);
    console.log(`   ✓ Total API permissions: ${rolePerms}`);

    console.log("\n✅ Depot Deliveries module added successfully!");
    console.log("\nNext steps:");
    console.log("1. Restart backend server");
    console.log("2. Log out and log back in as Inventory Depot user");
    console.log("3. Access 'Depot Deliveries' from sidebar");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

addDepotDeliveriesModule();
