/**
 * Setup Script: Offer Products Module
 * Creates API permissions, page permissions, and sidebar menu items
 * for Sales Admin and Inventory roles to manage offer/procured products
 *
 * Run: node setup-offer-products-module.js
 */

const mongoose = require("mongoose");
const {
  ApiPermission,
  PagePermission,
  SidebarMenuItem,
  RoleApiPermission,
  RolePagePermission,
  RoleSidebarMenuItem,
  Role,
} = require("./backend/src/models");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pusti-happy-times";

async function setupOfferProductsModule() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Step 1: Find Sales Admin and Inventory roles
    console.log("📋 Step 1: Finding roles...");
    const salesAdminRole = await Role.findOne({ role: "Sales Admin" });
    const inventoryRole = await Role.findOne({ role: "Inventory" });

    if (!salesAdminRole) {
      throw new Error("Sales Admin role not found");
    }
    if (!inventoryRole) {
      throw new Error("Inventory role not found");
    }

    console.log(`✅ Found Sales Admin role: ${salesAdminRole._id}`);
    console.log(`✅ Found Inventory role: ${inventoryRole._id}\n`);

    // Step 2: Create API Permissions
    console.log("📋 Step 2: Creating API permissions...");

    const apiPermissions = [
      {
        resource: "offers",
        action: "send:read",
        description: "View offer send items (Sales Admin)",
        module: "Offer Products",
      },
      {
        resource: "offers",
        action: "send:create",
        description: "Create offer send items (Sales Admin)",
        module: "Offer Products",
      },
      {
        resource: "offers",
        action: "send:update",
        description: "Update offer send items (Sales Admin)",
        module: "Offer Products",
      },
      {
        resource: "offers",
        action: "send:delete",
        description: "Delete offer send items (Sales Admin)",
        module: "Offer Products",
      },
      {
        resource: "offers",
        action: "receive:read",
        description: "View offer receive items (Inventory)",
        module: "Offer Products",
      },
      {
        resource: "offers",
        action: "receive:create",
        description: "Create/Receive offer items (Inventory)",
        module: "Offer Products",
      },
    ];

    const createdApiPermissions = [];
    for (const perm of apiPermissions) {
      let apiPerm = await ApiPermission.findOne({
        resource: perm.resource,
        action: perm.action,
      });

      if (!apiPerm) {
        apiPerm = await ApiPermission.create(perm);
        console.log(`   ✅ Created API permission: ${perm.resource}:${perm.action}`);
      } else {
        console.log(`   ⚠️  API permission already exists: ${perm.resource}:${perm.action}`);
      }
      createdApiPermissions.push(apiPerm);
    }

    // Step 3: Create Page Permissions
    console.log("\n📋 Step 3: Creating page permissions...");

    const pagePermissions = [
      {
        page_name: "Send Items",
        page_path: "/offers/senditems",
        description: "Send offer products to depots (Sales Admin)",
        module: "Offer Products",
      },
      {
        page_name: "Send Items List",
        page_path: "/offers/senditemslist",
        description: "View sent offer products history (Sales Admin)",
        module: "Offer Products",
      },
      {
        page_name: "Receive Items",
        page_path: "/offers/receiveitems",
        description: "Receive offer products at depot (Inventory)",
        module: "Offer Products",
      },
      {
        page_name: "Receive Items List",
        page_path: "/offers/receiveitemslist",
        description: "View received offer products history (Inventory)",
        module: "Offer Products",
      },
    ];

    const createdPagePermissions = [];
    for (const perm of pagePermissions) {
      let pagePerm = await PagePermission.findOne({
        page_path: perm.page_path,
      });

      if (!pagePerm) {
        pagePerm = await PagePermission.create(perm);
        console.log(`   ✅ Created page permission: ${perm.page_path}`);
      } else {
        console.log(`   ⚠️  Page permission already exists: ${perm.page_path}`);
      }
      createdPagePermissions.push(pagePerm);
    }

    // Step 4: Create Sidebar Menu Items
    console.log("\n📋 Step 4: Creating sidebar menu items...");

    // Find or create parent menu: Offer Products
    let parentMenu = await SidebarMenuItem.findOne({
      label: "Offer Products",
      parent_id: null,
    });

    if (!parentMenu) {
      parentMenu = await SidebarMenuItem.create({
        label: "Offer Products",
        icon: "LocalOffer",
        path: null,
        parent_id: null,
        order: 500,
        is_active: true,
      });
      console.log(`   ✅ Created parent menu: Offer Products`);
    } else {
      console.log(`   ⚠️  Parent menu already exists: Offer Products`);
    }

    // Create child menu items
    const menuItems = [
      {
        label: "Send Items",
        icon: "Send",
        path: "/offers/senditems",
        parent_id: parentMenu._id,
        order: 1,
        role: "Sales Admin",
      },
      {
        label: "Send Items List",
        icon: "List",
        path: "/offers/senditemslist",
        parent_id: parentMenu._id,
        order: 2,
        role: "Sales Admin",
      },
      {
        label: "Receive Items",
        icon: "Inbox",
        path: "/offers/receiveitems",
        parent_id: parentMenu._id,
        order: 3,
        role: "Inventory",
      },
      {
        label: "Receive Items List",
        icon: "Receipt",
        path: "/offers/receiveitemslist",
        parent_id: parentMenu._id,
        order: 4,
        role: "Inventory",
      },
    ];

    const createdMenuItems = [];
    for (const item of menuItems) {
      const { role, ...menuData } = item;
      let menuItem = await SidebarMenuItem.findOne({
        path: menuData.path,
      });

      if (!menuItem) {
        menuItem = await SidebarMenuItem.create({ ...menuData, is_active: true });
        console.log(`   ✅ Created menu item: ${menuData.label}`);
      } else {
        console.log(`   ⚠️  Menu item already exists: ${menuData.label}`);
      }
      createdMenuItems.push({ ...menuItem.toObject(), role });
    }

    // Step 5: Assign API Permissions to Roles
    console.log("\n📋 Step 5: Assigning API permissions to roles...");

    // Sales Admin: send:* permissions
    const salesAdminApiPerms = createdApiPermissions.filter((p) => p.action.startsWith("send:"));

    for (const perm of salesAdminApiPerms) {
      const existing = await RoleApiPermission.findOne({
        role_id: salesAdminRole._id,
        api_permission_id: perm._id,
      });

      if (!existing) {
        await RoleApiPermission.create({
          role_id: salesAdminRole._id,
          api_permission_id: perm._id,
        });
        console.log(`   ✅ Assigned ${perm.resource}:${perm.action} to Sales Admin`);
      } else {
        console.log(`   ⚠️  Already assigned: ${perm.resource}:${perm.action} to Sales Admin`);
      }
    }

    // Inventory: receive:* permissions
    const inventoryApiPerms = createdApiPermissions.filter((p) => p.action.startsWith("receive:"));

    for (const perm of inventoryApiPerms) {
      const existing = await RoleApiPermission.findOne({
        role_id: inventoryRole._id,
        api_permission_id: perm._id,
      });

      if (!existing) {
        await RoleApiPermission.create({
          role_id: inventoryRole._id,
          api_permission_id: perm._id,
        });
        console.log(`   ✅ Assigned ${perm.resource}:${perm.action} to Inventory`);
      } else {
        console.log(`   ⚠️  Already assigned: ${perm.resource}:${perm.action} to Inventory`);
      }
    }

    // Step 6: Assign Page Permissions to Roles
    console.log("\n📋 Step 6: Assigning page permissions to roles...");

    // Sales Admin: Send Items pages
    const salesAdminPages = createdPagePermissions.filter((p) => p.page_path.includes("send"));

    for (const perm of salesAdminPages) {
      const existing = await RolePagePermission.findOne({
        role_id: salesAdminRole._id,
        page_permission_id: perm._id,
      });

      if (!existing) {
        await RolePagePermission.create({
          role_id: salesAdminRole._id,
          page_permission_id: perm._id,
        });
        console.log(`   ✅ Assigned ${perm.page_path} to Sales Admin`);
      } else {
        console.log(`   ⚠️  Already assigned: ${perm.page_path} to Sales Admin`);
      }
    }

    // Inventory: Receive Items pages
    const inventoryPages = createdPagePermissions.filter((p) => p.page_path.includes("receive"));

    for (const perm of inventoryPages) {
      const existing = await RolePagePermission.findOne({
        role_id: inventoryRole._id,
        page_permission_id: perm._id,
      });

      if (!existing) {
        await RolePagePermission.create({
          role_id: inventoryRole._id,
          page_permission_id: perm._id,
        });
        console.log(`   ✅ Assigned ${perm.page_path} to Inventory`);
      } else {
        console.log(`   ⚠️  Already assigned: ${perm.page_path} to Inventory`);
      }
    }

    // Step 7: Assign Menu Items to Roles
    console.log("\n📋 Step 7: Assigning menu items to roles...");

    for (const item of createdMenuItems) {
      const roleId = item.role === "Sales Admin" ? salesAdminRole._id : inventoryRole._id;
      const menuItemId = item._id;

      const existing = await RoleSidebarMenuItem.findOne({
        role_id: roleId,
        sidebar_menu_item_id: menuItemId,
      });

      if (!existing) {
        await RoleSidebarMenuItem.create({
          role_id: roleId,
          sidebar_menu_item_id: menuItemId,
        });
        console.log(`   ✅ Assigned menu "${item.label}" to ${item.role}`);
      } else {
        console.log(`   ⚠️  Already assigned: menu "${item.label}" to ${item.role}`);
      }
    }

    // Also assign parent menu to both roles
    for (const role of [salesAdminRole, inventoryRole]) {
      const existing = await RoleSidebarMenuItem.findOne({
        role_id: role._id,
        sidebar_menu_item_id: parentMenu._id,
      });

      if (!existing) {
        await RoleSidebarMenuItem.create({
          role_id: role._id,
          sidebar_menu_item_id: parentMenu._id,
        });
        console.log(`   ✅ Assigned parent menu "Offer Products" to ${role.role}`);
      } else {
        console.log(`   ⚠️  Already assigned: parent menu "Offer Products" to ${role.role}`);
      }
    }

    console.log("\n✨ Offer Products module setup completed successfully!\n");
    console.log("📝 Summary:");
    console.log(`   - API Permissions: ${createdApiPermissions.length}`);
    console.log(`   - Page Permissions: ${createdPagePermissions.length}`);
    console.log(`   - Menu Items: ${createdMenuItems.length + 1} (including parent)`);
    console.log(`   - Roles configured: Sales Admin, Inventory\n`);
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  }
}

// Run the setup
setupOfferProductsModule();
