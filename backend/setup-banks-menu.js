require("dotenv").config();
const mongoose = require("mongoose");

async function setupBanksMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const SidebarMenuItem = mongoose.model(
      "SidebarMenuItem",
      new mongoose.Schema({}, { strict: false }),
      "sidebar_menu_items"
    );

    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );

    const RoleApiPermission = mongoose.model(
      "RoleApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "roles_api_permissions"
    );

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");

    const RoleSidebarMenuItem = mongoose.model(
      "RoleSidebarMenuItem",
      new mongoose.Schema({}, { strict: false }),
      "role_sidebar_menu_items"
    );

    // 1. Find or create Master parent menu item
    let masterMenu = await SidebarMenuItem.findOne({
      label: "Master",
      parent_id: null,
    });

    if (!masterMenu) {
      const maxOrder = await SidebarMenuItem.findOne({ parent_id: null })
        .sort({ m_order: -1 })
        .limit(1);

      const newOrder = maxOrder ? maxOrder.m_order + 1 : 3;

      masterMenu = new SidebarMenuItem({
        label: "Master",
        href: null,
        m_order: newOrder,
        icon: "FaDatabase",
        parent_id: null,
        is_submenu: false,
      });
      await masterMenu.save();
      console.log("✅ Created Master parent menu:", masterMenu._id);
    }

    console.log("Found/Created Master menu:", masterMenu.label, "- ID:", masterMenu._id);

    // 2. Check if Banks menu item already exists
    const existingMenuItem = await SidebarMenuItem.findOne({
      label: "Banks",
      parent_id: masterMenu._id,
    });

    let menuItemId;

    if (existingMenuItem) {
      console.log("Banks menu item already exists:", existingMenuItem._id);
      menuItemId = existingMenuItem._id;
    } else {
      const maxSortOrder = await SidebarMenuItem.findOne({ parent_id: masterMenu._id })
        .sort({ m_order: -1 })
        .limit(1);

      const newSortOrder = maxSortOrder ? maxSortOrder.m_order + 0.1 : masterMenu.m_order + 0.1;

      const newMenuItem = new SidebarMenuItem({
        label: "Banks",
        href: "/master/banks",
        m_order: newSortOrder,
        icon: "FaUniversity",
        parent_id: masterMenu._id,
        is_submenu: true,
      });

      await newMenuItem.save();
      menuItemId = newMenuItem._id;
      console.log("✅ Created Banks menu item:", menuItemId);
    }

    // 3. Create API permissions for banks
    const permissions = [
      { api_permissions: "banks:read" },
      { api_permissions: "banks:create" },
      { api_permissions: "banks:update" },
      { api_permissions: "banks:delete" },
    ];

    const createdPermissions = [];

    for (const perm of permissions) {
      const existing = await ApiPermission.findOne({ api_permissions: perm.api_permissions });

      if (existing) {
        console.log(`Permission ${perm.api_permissions} already exists:`, existing._id);
        createdPermissions.push(existing);
      } else {
        const newPerm = new ApiPermission({
          api_permissions: perm.api_permissions,
        });
        await newPerm.save();
        createdPermissions.push(newPerm);
        console.log(`✅ Created permission: ${perm.api_permissions}`, newPerm._id);
      }
    }

    // 4. Assign permissions to SuperAdmin role
    const superAdminRole = await Role.findOne({ role: "SuperAdmin" });

    if (!superAdminRole) {
      console.error("❌ SuperAdmin role not found!");
      process.exit(1);
    }

    console.log(`\nProcessing role: ${superAdminRole.role} (${superAdminRole._id})`);

    for (const perm of createdPermissions) {
      const existing = await RoleApiPermission.findOne({
        role_id: superAdminRole._id,
        api_permission_id: perm._id,
      });

      if (!existing) {
        const roleApiPerm = new RoleApiPermission({
          role_id: superAdminRole._id,
          api_permission_id: perm._id,
        });
        await roleApiPerm.save();
        console.log(`✅ Assigned ${perm.api_permissions} to ${superAdminRole.role}`);
      } else {
        console.log(
          `Permission ${perm.api_permissions} already assigned to ${superAdminRole.role}`
        );
      }
    }

    // Also assign the menu item to the role
    const existingMenuAssignment = await RoleSidebarMenuItem.findOne({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: menuItemId,
    });

    if (!existingMenuAssignment) {
      const roleMenuAssignment = new RoleSidebarMenuItem({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: menuItemId,
        can_view: true,
        can_create: true,
        can_update: true,
        can_delete: true,
      });
      await roleMenuAssignment.save();
      console.log(`✅ Assigned menu item to ${superAdminRole.role}`);
    } else {
      console.log(`Menu item already assigned to ${superAdminRole.role}`);
    }

    console.log("\n✅ Banks menu and permissions setup completed!");
    console.log("\n📋 Summary:");
    console.log("- Menu Item: Banks (/master/banks)");
    console.log("- API Permissions: banks:read, banks:create, banks:update, banks:delete");
    console.log("- Assigned to: SuperAdmin role");
  } catch (error) {
    console.error("❌ Error setting up banks menu:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

setupBanksMenu();
