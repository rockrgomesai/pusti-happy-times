/**
 * Seed Production Module Menu and Permissions
 * Creates sidebar menu items and API permissions for Production "Send to Store"
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function seedProductionMenu() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const SidebarMenuItem = require("../src/models/SidebarMenuItem");
    const ApiPermission = require("../src/models/ApiPermission");
    const PagePermission = require("../src/models/PagePermission");
    const Role = require("../src/models/Role");
    const {
      RoleApiPermission,
      RoleSidebarMenuItem,
      RolePagePermission,
    } = require("../src/models/JunctionTables");

    // Find Production role
    const productionRole = await Role.findOne({ role: "Production" });
    if (!productionRole) {
      console.error("❌ Production role not found. Please create Production role first.");
      process.exit(1);
    }
    console.log(`✅ Found Production role: ${productionRole._id}`);

    // 1. Create/Update Sidebar Menu Item
    console.log("\n📋 Creating sidebar menu items...");

    // Find or create Production parent menu
    let productionParentMenu = await SidebarMenuItem.findOne({
      label: "Production",
      parent_id: null,
    });

    if (!productionParentMenu) {
      productionParentMenu = await SidebarMenuItem.create({
        label: "Production",
        href: null,
        m_order: 60,
        icon: "FaIndustry",
        parent_id: null,
        is_submenu: false,
      });
      console.log(`✅ Created Production parent menu: ${productionParentMenu._id}`);
    } else {
      console.log(`✅ Production parent menu exists: ${productionParentMenu._id}`);
    }

    // Create Send to Store menu item
    let sendToStoreMenu = await SidebarMenuItem.findOne({
      label: "Send to Store",
      parent_id: productionParentMenu._id,
    });

    if (!sendToStoreMenu) {
      sendToStoreMenu = await SidebarMenuItem.create({
        label: "Send to Store",
        href: "/production/sendtostore",
        m_order: 1,
        icon: "FaTruck",
        parent_id: productionParentMenu._id,
        is_submenu: false,
      });
      console.log(`✅ Created Send to Store menu: ${sendToStoreMenu._id}`);
    } else {
      console.log(`✅ Send to Store menu exists: ${sendToStoreMenu._id}`);
    }

    // 2. Create API Permissions
    console.log("\n🔐 Creating API permissions...");

    const apiPermissions = [
      {
        resource: "production:send-to-store",
        action: "read",
        description: "View production send to store shipments",
      },
      {
        resource: "production:send-to-store",
        action: "create",
        description: "Create production send to store shipments",
      },
      {
        resource: "production:send-to-store",
        action: "update",
        description: "Update production send to store shipments",
      },
      {
        resource: "production:send-to-store",
        action: "delete",
        description: "Cancel/delete production send to store shipments",
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
        console.log(`✅ Created API permission: ${perm.resource}:${perm.action}`);
      } else {
        console.log(`✅ API permission exists: ${perm.resource}:${perm.action}`);
      }

      createdApiPermissions.push(apiPerm);
    }

    // 3. Create Page Permission
    console.log("\n📄 Creating page permissions...");

    let pagePermission = await PagePermission.findOne({
      page_path: "/production/sendtostore",
    });

    if (!pagePermission) {
      pagePermission = await PagePermission.create({
        page_path: "/production/sendtostore",
        page_name: "Production - Send to Store",
        description: "Send manufactured products from factory to factory store",
        active: true,
      });
      console.log(`✅ Created page permission: ${pagePermission.page_path}`);
    } else {
      console.log(`✅ Page permission exists: ${pagePermission.page_path}`);
    }

    // 4. Assign Menu Items to Production Role
    console.log("\n🔗 Assigning menu items to Production role...");

    for (const menu of [productionParentMenu, sendToStoreMenu]) {
      const existing = await RoleSidebarMenuItem.findOne({
        role_id: productionRole._id,
        sidebar_menu_item_id: menu._id,
      });

      if (!existing) {
        await RoleSidebarMenuItem.create({
          role_id: productionRole._id,
          sidebar_menu_item_id: menu._id,
        });
        console.log(`✅ Assigned menu "${menu.label}" to Production role`);
      } else {
        console.log(`✅ Menu "${menu.label}" already assigned to Production role`);
      }
    }

    // 5. Assign API Permissions to Production Role
    console.log("\n🔗 Assigning API permissions to Production role...");

    for (const apiPerm of createdApiPermissions) {
      const existing = await RoleApiPermission.findOne({
        role_id: productionRole._id,
        api_permission_id: apiPerm._id,
      });

      if (!existing) {
        await RoleApiPermission.create({
          role_id: productionRole._id,
          api_permission_id: apiPerm._id,
        });
        console.log(
          `✅ Assigned API permission ${apiPerm.resource}:${apiPerm.action} to Production role`
        );
      } else {
        console.log(`✅ API permission ${apiPerm.resource}:${apiPerm.action} already assigned`);
      }
    }

    // 6. Assign Page Permission to Production Role
    console.log("\n🔗 Assigning page permission to Production role...");

    const existingPagePerm = await RolePagePermission.findOne({
      role_id: productionRole._id,
      pg_permission_id: pagePermission._id,
    });

    if (!existingPagePerm) {
      await RolePagePermission.create({
        role_id: productionRole._id,
        pg_permission_id: pagePermission._id,
      });
      console.log(`✅ Assigned page permission to Production role`);
    } else {
      console.log(`✅ Page permission already assigned to Production role`);
    }

    console.log("\n\n✅ ===== SEED COMPLETE =====");
    console.log("Production Module setup:");
    console.log(`  - Parent Menu: Production (${productionParentMenu._id})`);
    console.log(`  - Child Menu: Send to Store (${sendToStoreMenu._id})`);
    console.log(`  - API Permissions: ${createdApiPermissions.length}`);
    console.log(`  - Page Permission: ${pagePermission.page_path}`);
    console.log(`  - Role: Production (${productionRole.role})`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

seedProductionMenu();
