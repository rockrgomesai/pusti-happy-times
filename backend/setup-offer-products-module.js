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
} = require("./src/models");

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function setupOfferProductsModule() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Step 1: Find Sales Admin and Inventory roles
    console.log("📋 Step 1: Finding roles...");
    const salesAdminRole = await Role.findOne({ role: "Sales Admin" });
    const inventoryRole = await Role.findOne({ role: "Inventory Depot" });

    if (!salesAdminRole) {
      throw new Error("Sales Admin role not found");
    }
    if (!inventoryRole) {
      throw new Error("Inventory Depot role not found");
    }

    console.log(`✅ Found Sales Admin role: ${salesAdminRole._id}`);
    console.log(`✅ Found Inventory Depot role: ${inventoryRole._id}\n`);

    // Step 2: Create API Permissions
    console.log("📋 Step 2: Creating API permissions...");

    const apiPermissionNames = [
      "offers:send:read",
      "offers:send:create",
      "offers:send:update",
      "offers:send:delete",
      "offers:receive:read",
      "offers:receive:create",
    ];

    const createdApiPermissions = [];
    for (const permName of apiPermissionNames) {
      let apiPerm = await ApiPermission.findOne({ api_permissions: permName });

      if (!apiPerm) {
        apiPerm = await ApiPermission.create({ api_permissions: permName });
        console.log(`   ✅ Created API permission: ${permName}`);
      } else {
        console.log(`   ⚠️  API permission already exists: ${permName}`);
      }
      createdApiPermissions.push(apiPerm);
    }

    // Step 3: Create Page Permissions
    console.log("\n📋 Step 3: Creating page permissions...");

    const pagePermissionNames = [
      "pg:offers:senditems",
      "pg:offers:senditemslist",
      "pg:offers:receiveitems",
      "pg:offers:receiveitemslist",
    ];

    const createdPagePermissions = [];
    for (const permName of pagePermissionNames) {
      let pagePerm = await PagePermission.findOne({ pg_permissions: permName });

      if (!pagePerm) {
        pagePerm = await PagePermission.create({ pg_permissions: permName });
        console.log(`   ✅ Created page permission: ${permName}`);
      } else {
        console.log(`   ⚠️  Page permission already exists: ${permName}`);
      }
      createdPagePermissions.push(pagePerm);
    }

    // Step 4: Create Sidebar Menu Items
    console.log("\n📋 Step 4: Creating sidebar menu items...");

    const db = mongoose.connection.db;
    const menuCollection = db.collection("sidebar_menu_items");

    // Find or create parent menu: Offer Products
    let parentMenu = await menuCollection.findOne({
      label: "Offer Products",
      is_submenu: false,
    });

    if (!parentMenu) {
      const result = await menuCollection.insertOne({
        label: "Offer Products",
        href: null,
        icon: "FaGift",
        parent_id: null,
        is_submenu: false,
        m_order: 600,
      });
      parentMenu = await menuCollection.findOne({ _id: result.insertedId });
      console.log(`   ✅ Created parent menu: Offer Products (${parentMenu._id})`);
    } else {
      console.log(`   ✅ Parent menu already exists: Offer Products (${parentMenu._id})`);
    }

    // Create child menu items
    const menuItems = [
      {
        label: "Send Items",
        href: "/offers/senditems",
        icon: "FaPaperPlane",
        parent_id: parentMenu._id,
        is_submenu: true,
        m_order: 1,
        role: "Sales Admin",
      },
      {
        label: "Send Items List",
        href: "/offers/senditemslist",
        icon: "FaList",
        parent_id: parentMenu._id,
        is_submenu: true,
        m_order: 2,
        role: "Sales Admin",
      },
      {
        label: "Receive Items",
        href: "/offers/receiveitems",
        icon: "FaInbox",
        parent_id: parentMenu._id,
        is_submenu: true,
        m_order: 3,
        role: "Inventory Depot",
      },
      {
        label: "Receive Items List",
        href: "/offers/receiveitemslist",
        icon: "FaReceipt",
        parent_id: parentMenu._id,
        is_submenu: true,
        m_order: 4,
        role: "Inventory Depot",
      },
    ];

    const createdMenuItems = [];
    for (const item of menuItems) {
      const { role, ...menuData } = item;
      let menuItem = await menuCollection.findOne({
        href: menuData.href,
      });

      if (!menuItem) {
        const result = await menuCollection.insertOne(menuData);
        menuItem = await menuCollection.findOne({ _id: result.insertedId });
        console.log(`   ✅ Created menu item: ${menuData.label} (${menuItem._id})`);
      } else {
        console.log(`   ✅ Menu item already exists: ${menuData.label} (${menuItem._id})`);
      }
      createdMenuItems.push({ ...menuItem, role });
    }

    // Step 5: Assign API Permissions to Roles
    console.log("\n📋 Step 5: Assigning API permissions to roles...");

    // Sales Admin: send:* permissions
    const salesAdminApiPerms = createdApiPermissions.filter((p) =>
      p.api_permissions.includes("send:")
    );

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
        console.log(`   ✅ Assigned ${perm.api_permissions} to Sales Admin`);
      } else {
        console.log(`   ⚠️  Already assigned: ${perm.api_permissions} to Sales Admin`);
      }
    }

    // Inventory Depot: receive:* permissions
    const inventoryApiPerms = createdApiPermissions.filter((p) =>
      p.api_permissions.includes("receive:")
    );

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
        console.log(`   ✅ Assigned ${perm.api_permissions} to Inventory Depot`);
      } else {
        console.log(`   ⚠️  Already assigned: ${perm.api_permissions} to Inventory Depot`);
      }
    }

    // Step 6: Assign Page Permissions to Roles
    console.log("\n📋 Step 6: Assigning page permissions to roles...");

    // Sales Admin: Send Items pages
    const salesAdminPages = createdPagePermissions.filter((p) => p.pg_permissions.includes("send"));

    for (const perm of salesAdminPages) {
      const existing = await RolePagePermission.findOne({
        role_id: salesAdminRole._id,
        pg_permission_id: perm._id,
      });

      if (!existing) {
        await RolePagePermission.create({
          role_id: salesAdminRole._id,
          pg_permission_id: perm._id,
        });
        console.log(`   ✅ Assigned ${perm.pg_permissions} to Sales Admin`);
      } else {
        console.log(`   ⚠️  Already assigned: ${perm.pg_permissions} to Sales Admin`);
      }
    }

    // Inventory Depot: Receive Items pages
    const inventoryPages = createdPagePermissions.filter((p) =>
      p.pg_permissions.includes("receive")
    );

    for (const perm of inventoryPages) {
      const existing = await RolePagePermission.findOne({
        role_id: inventoryRole._id,
        pg_permission_id: perm._id,
      });

      if (!existing) {
        await RolePagePermission.create({
          role_id: inventoryRole._id,
          pg_permission_id: perm._id,
        });
        console.log(`   ✅ Assigned ${perm.pg_permissions} to Inventory Depot`);
      } else {
        console.log(`   ⚠️  Already assigned: ${perm.pg_permissions} to Inventory Depot`);
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
