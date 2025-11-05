/**
 * Setup Customer Ledger Menu & Permissions
 *
 * This script creates:
 * 1. Finance parent menu (if not exists)
 * 2. Customer Ledger submenu under Finance
 * 3. API permissions (customerledger:read, create, update, delete)
 * 4. Assigns permissions to roles: SuperAdmin, HQ employee roles, Zonal, Regional, Area, Distributor
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function setupCustomerLedgerMenu() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const sidebarMenuCollection = db.collection("sidebar_menu_items");
    const apiPermissionsCollection = db.collection("api_permissions");
    const rolesCollection = db.collection("roles");
    const roleMenuCollection = db.collection("role_sidebar_menu_items");
    const roleApiPermissionsCollection = db.collection("role_api_permissions");

    // ========================================
    // STEP 1: Create/Find Finance Parent Menu
    // ========================================
    let financeMenu = await sidebarMenuCollection.findOne({ label: "Finance", parent_id: null });

    if (!financeMenu) {
      // Get the highest m_order for parent menus
      const maxOrderMenu = await sidebarMenuCollection.findOne(
        { parent_id: null },
        { sort: { m_order: -1 }, projection: { m_order: 1 } }
      );
      const nextOrder = maxOrderMenu ? maxOrderMenu.m_order + 1 : 10;

      const financeMenuDoc = {
        label: "Finance",
        icon: "FaMoneyBillWave",
        href: null,
        parent_id: null,
        m_order: nextOrder,
        is_submenu: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await sidebarMenuCollection.insertOne(financeMenuDoc);
      financeMenu = { _id: result.insertedId, ...financeMenuDoc };
      console.log(`✅ Created Finance parent menu - ID: ${financeMenu._id}`);
    } else {
      console.log(`Found existing Finance menu: Finance - ID: ${financeMenu._id}`);
    }

    // ========================================
    // STEP 2: Create Customer Ledger Submenu
    // ========================================
    let customerLedgerMenu = await sidebarMenuCollection.findOne({
      label: "Customer Ledger",
      parent_id: financeMenu._id,
    });

    if (!customerLedgerMenu) {
      // Get the highest m_order for Finance submenus
      const maxOrderSubmenu = await sidebarMenuCollection.findOne(
        { parent_id: financeMenu._id },
        { sort: { m_order: -1 }, projection: { m_order: 1 } }
      );
      const nextSubmenuOrder = maxOrderSubmenu
        ? maxOrderSubmenu.m_order + 0.1
        : financeMenu.m_order + 0.1;

      const customerLedgerMenuDoc = {
        label: "Customer Ledger",
        icon: "FaBook",
        href: "/finance/customerledger",
        parent_id: financeMenu._id,
        m_order: nextSubmenuOrder,
        is_submenu: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await sidebarMenuCollection.insertOne(customerLedgerMenuDoc);
      customerLedgerMenu = { _id: result.insertedId, ...customerLedgerMenuDoc };
      console.log(`✅ Created Customer Ledger menu item - ID: ${customerLedgerMenu._id}`);
    } else {
      console.log(`Customer Ledger menu item already exists: ${customerLedgerMenu._id}`);
    }

    // ========================================
    // STEP 3: Create API Permissions
    // ========================================
    const permissionsToCreate = [
      { api_permissions: "customerledger:read" },
      { api_permissions: "customerledger:create" },
      { api_permissions: "customerledger:update" },
      { api_permissions: "customerledger:delete" },
    ];

    const createdPermissions = {};

    for (const perm of permissionsToCreate) {
      let existingPerm = await apiPermissionsCollection.findOne({
        api_permissions: perm.api_permissions,
      });

      if (!existingPerm) {
        const result = await apiPermissionsCollection.insertOne(perm);
        existingPerm = { _id: result.insertedId, ...perm };
        console.log(`✅ Created permission: ${perm.api_permissions} new ${existingPerm._id}`);
      } else {
        console.log(`Permission ${perm.api_permissions} already exists`);
      }

      createdPermissions[perm.api_permissions] = existingPerm;
    }

    // ========================================
    // STEP 4: Assign to Roles
    // ========================================
    // Roles: SuperAdmin, HQ employee roles (HOS, MIS, Office Admin, Finance), ZSM (Zonal), RSM (Regional), ASM (Area), Distributor
    const targetRoleNames = [
      "SuperAdmin",
      "HOS", // HQ
      "MIS", // HQ
      "Office Admin", // HQ
      "Finance", // HQ
      "ZSM", // Zonal Manager
      "RSM", // Regional Manager
      "ASM", // Area Manager
      "Distributor",
    ];
    console.log("\n📋 Assigning permissions to roles...");

    for (const roleName of targetRoleNames) {
      const role = await rolesCollection.findOne({ role: roleName });

      if (!role) {
        console.log(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      console.log(`\nProcessing role: ${roleName} (${role._id})`);

      // Assign API Permissions
      for (const [permName, permDoc] of Object.entries(createdPermissions)) {
        const existingApiPerm = await roleApiPermissionsCollection.findOne({
          role_id: role._id,
          api_permission_id: permDoc._id,
        });

        if (!existingApiPerm) {
          await roleApiPermissionsCollection.insertOne({
            role_id: role._id,
            api_permission_id: permDoc._id,
            created_at: new Date(),
            updated_at: new Date(),
          });
          console.log(`  ✅ Assigned ${permName} to ${roleName}`);
        } else {
          console.log(`  Permission ${permName} already assigned to ${roleName}`);
        }
      }

      // Assign Menu Item
      const existingMenuAssignment = await roleMenuCollection.findOne({
        role_id: role._id,
        sidebar_menu_item_id: customerLedgerMenu._id,
      });

      if (!existingMenuAssignment) {
        await roleMenuCollection.insertOne({
          role_id: role._id,
          sidebar_menu_item_id: customerLedgerMenu._id,
        });
        console.log(`  ✅ Assigned Customer Ledger menu to ${roleName}`);
      } else {
        console.log(`  Menu item already assigned to ${roleName}`);
      }
    }

    console.log("\n✅ Customer Ledger menu and permissions setup completed!");
    console.log("\n📋 Summary:");
    console.log(`  - Parent Menu: Finance (/finance)`);
    console.log(`  - Submenu: Customer Ledger (/finance/customerledger)`);
    console.log(
      `  - API Permissions: customerledger:read, customerledger:create, customerledger:update, customerledger:delete`
    );
    console.log(`  - Assigned to roles: ${targetRoleNames.join(", ")}`);
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

setupCustomerLedgerMenu();
