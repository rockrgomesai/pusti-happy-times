/**
 * Setup Distributor Chalan Receiving Module
 * Creates API permissions and menu items for distributor chalan receiving functionality
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function setupDistributorChalanModule() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const apiPermissionsCollection = db.collection("apipermissions");
    const sidebarMenuCollection = db.collection("sidebarmenuitems");
    const rolesCollection = db.collection("roles");
    const roleApiPermissionsCollection = db.collection("roleapipermissions");
    const roleSidebarMenuCollection = db.collection("rolesidebarmenuitems");

    // ========================================
    // STEP 1: Create API Permissions
    // ========================================
    console.log("\n📋 Step 1: Creating API Permissions...");

    const permissions = [
      { api_permissions: "distributor-chalan:read" },
      { api_permissions: "distributor-chalan:receive" },
    ];

    const createdPermissions = {};

    for (const perm of permissions) {
      let existingPerm = await apiPermissionsCollection.findOne({
        api_permissions: perm.api_permissions,
      });

      if (!existingPerm) {
        const result = await apiPermissionsCollection.insertOne(perm);
        existingPerm = { _id: result.insertedId, ...perm };
        console.log(`  ✅ Created permission: ${perm.api_permissions}`);
      } else {
        console.log(`  ℹ️  Permission already exists: ${perm.api_permissions}`);
      }

      createdPermissions[perm.api_permissions] = existingPerm;
    }

    // ========================================
    // STEP 2: Find or Create Distributor Parent Menu
    // ========================================
    console.log("\n📋 Step 2: Setting up Distributor menu...");

    let distributorMenu = await sidebarMenuCollection.findOne({
      label: "Distributor",
      parent_id: null,
    });

    if (!distributorMenu) {
      const maxOrder = await sidebarMenuCollection.findOne(
        { parent_id: null },
        { sort: { m_order: -1 }, projection: { m_order: 1 } }
      );
      const nextOrder = maxOrder ? maxOrder.m_order + 1 : 1;

      const distributorMenuDoc = {
        label: "Distributor",
        icon: "FaStore",
        href: null,
        parent_id: null,
        m_order: nextOrder,
        is_submenu: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await sidebarMenuCollection.insertOne(distributorMenuDoc);
      distributorMenu = { _id: result.insertedId, ...distributorMenuDoc };
      console.log(`  ✅ Created Distributor parent menu - ID: ${distributorMenu._id}`);
    } else {
      console.log(`  ℹ️  Found existing Distributor menu: ${distributorMenu._id}`);
    }

    // ========================================
    // STEP 3: Create Receive Chalans Submenu
    // ========================================
    console.log("\n📋 Step 3: Creating Receive Chalans submenu...");

    let receiveChalansMenu = await sidebarMenuCollection.findOne({
      label: "Receive Chalans",
      parent_id: distributorMenu._id,
    });

    if (!receiveChalansMenu) {
      const maxOrderSubmenu = await sidebarMenuCollection.findOne(
        { parent_id: distributorMenu._id },
        { sort: { m_order: -1 }, projection: { m_order: 1 } }
      );
      const nextSubmenuOrder = maxOrderSubmenu
        ? maxOrderSubmenu.m_order + 0.1
        : distributorMenu.m_order + 0.1;

      const receiveChalansMenuDoc = {
        label: "Receive Chalans",
        icon: "FaTruck",
        href: "/distributor/chalans",
        parent_id: distributorMenu._id,
        m_order: nextSubmenuOrder,
        is_submenu: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await sidebarMenuCollection.insertOne(receiveChalansMenuDoc);
      receiveChalansMenu = { _id: result.insertedId, ...receiveChalansMenuDoc };
      console.log(`  ✅ Created Receive Chalans menu item - ID: ${receiveChalansMenu._id}`);
    } else {
      console.log(`  ℹ️  Receive Chalans menu item already exists: ${receiveChalansMenu._id}`);
    }

    // ========================================
    // STEP 4: Assign Permissions and Menu to Distributor Role
    // ========================================
    console.log("\n📋 Step 4: Assigning permissions and menu to Distributor role...");

    const distributorRole = await rolesCollection.findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.log("  ⚠️  Distributor role not found. Please create it first.");
    } else {
      console.log(`  ✅ Found Distributor role: ${distributorRole._id}`);

      // Assign API Permissions
      for (const permKey in createdPermissions) {
        const permission = createdPermissions[permKey];

        const existingAssignment = await roleApiPermissionsCollection.findOne({
          role_id: distributorRole._id,
          api_permission_id: permission._id,
        });

        if (!existingAssignment) {
          await roleApiPermissionsCollection.insertOne({
            role_id: distributorRole._id,
            api_permission_id: permission._id,
          });
          console.log(`  ✅ Assigned ${permKey} to Distributor role`);
        } else {
          console.log(`  ℹ️  ${permKey} already assigned to Distributor role`);
        }
      }

      // Assign Menu Item
      const existingMenuAssignment = await roleSidebarMenuCollection.findOne({
        role_id: distributorRole._id,
        sidebar_menu_item_id: receiveChalansMenu._id,
      });

      if (!existingMenuAssignment) {
        await roleSidebarMenuCollection.insertOne({
          role_id: distributorRole._id,
          sidebar_menu_item_id: receiveChalansMenu._id,
        });
        console.log(`  ✅ Assigned Receive Chalans menu to Distributor role`);
      } else {
        console.log(`  ℹ️  Menu item already assigned to Distributor role`);
      }
    }

    console.log("\n✅ Distributor Chalan Receiving module setup completed!");
    console.log("\n📋 Summary:");
    console.log(`  - Parent Menu: Distributor (/distributor)`);
    console.log(`  - Submenu: Receive Chalans (/distributor/chalans)`);
    console.log(`  - API Permissions: distributor-chalan:read, distributor-chalan:receive`);
    console.log(`  - Assigned to: Distributor role`);
  } catch (error) {
    console.error("❌ Error setting up distributor chalan module:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
}

setupDistributorChalanModule();
