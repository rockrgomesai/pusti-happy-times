require("dotenv").config();
const mongoose = require("mongoose");

async function setupRequisitionsMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

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

    // 1. Find or create Inventory parent menu item
    let inventoryMenu = await SidebarMenuItem.findOne({
      label: "Inventory",
      parent_id: null,
    });

    if (!inventoryMenu) {
      // Get max m_order for parent menus
      const maxOrder = await SidebarMenuItem.findOne({ parent_id: null })
        .sort({ m_order: -1 })
        .limit(1);

      const newOrder = maxOrder ? maxOrder.m_order + 1 : 10;

      inventoryMenu = new SidebarMenuItem({
        label: "Inventory",
        href: null,
        m_order: newOrder,
        icon: "FaWarehouse",
        parent_id: null,
        is_submenu: false,
      });
      await inventoryMenu.save();
      console.log("✅ Created Inventory parent menu:", inventoryMenu._id);
    }

    console.log("Found/Created Inventory menu:", inventoryMenu.label, "- ID:", inventoryMenu._id);

    // 2. Check if Requisitions menu item already exists
    const existingMenuItem = await SidebarMenuItem.findOne({
      label: "Requisitions",
      parent_id: inventoryMenu._id,
    });

    let menuItemId;

    if (existingMenuItem) {
      console.log("Requisitions menu item already exists:", existingMenuItem._id);
      menuItemId = existingMenuItem._id;
    } else {
      // Get the max m_order for Inventory children
      const maxSortOrder = await SidebarMenuItem.findOne({ parent_id: inventoryMenu._id })
        .sort({ m_order: -1 })
        .limit(1);

      const newSortOrder = maxSortOrder ? maxSortOrder.m_order + 0.1 : inventoryMenu.m_order + 0.1;

      // Create menu item
      const newMenuItem = new SidebarMenuItem({
        label: "Requisitions",
        href: "/inventory/requisitions",
        m_order: newSortOrder,
        icon: "FaFileInvoice",
        parent_id: inventoryMenu._id,
        is_submenu: true,
      });

      await newMenuItem.save();
      menuItemId = newMenuItem._id;
      console.log("✅ Created Requisitions menu item:", menuItemId);
    }

    // 3. Create API permissions for requisitions
    const permissions = [
      { api_permissions: "inventory:requisitions:read" },
      { api_permissions: "inventory:requisitions:write" },
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

    // 4. Assign permissions to Inventory Factory and Inventory Depot roles
    const roles = await Role.find({
      role: { $in: ["Inventory Factory", "Inventory Depot"] },
    });

    if (roles.length === 0) {
      console.error("Inventory Factory/Depot roles not found!");
      process.exit(1);
    }

    for (const role of roles) {
      console.log(`\nProcessing role: ${role.role} (${role._id})`);

      for (const perm of createdPermissions) {
        const existing = await RoleApiPermission.findOne({
          role_id: role._id,
          api_permission_id: perm._id,
        });

        if (!existing) {
          const roleApiPerm = new RoleApiPermission({
            role_id: role._id,
            api_permission_id: perm._id,
          });
          await roleApiPerm.save();
          console.log(`✅ Assigned ${perm.api_permissions} to ${role.role}`);
        } else {
          console.log(`Permission ${perm.api_permissions} already assigned to ${role.role}`);
        }
      }

      // Also assign the menu item to the role
      const existingMenuAssignment = await RoleSidebarMenuItem.findOne({
        role_id: role._id,
        sidebar_menu_item_id: menuItemId,
      });

      if (!existingMenuAssignment) {
        const roleMenuAssignment = new RoleSidebarMenuItem({
          role_id: role._id,
          sidebar_menu_item_id: menuItemId,
          can_view: true,
          can_create: true,
          can_update: true,
          can_delete: false,
        });
        await roleMenuAssignment.save();
        console.log(`✅ Assigned menu item to ${role.role}`);
      } else {
        console.log(`Menu item already assigned to ${role.role}`);
      }
    }

    console.log("\n✅ Requisitions menu and permissions setup completed!");
    console.log("\n📋 Summary:");
    console.log("- Menu Item: Requisitions (/inventory/requisitions)");
    console.log("- API Permissions: inventory:requisitions:read, inventory:requisitions:write");
    console.log("- Assigned to: Inventory Factory, Inventory Depot roles");
  } catch (error) {
    console.error("Error setting up requisitions menu:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

setupRequisitionsMenu();
