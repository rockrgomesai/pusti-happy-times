// Complete DSR Setup Script - Safe for Production
// This script sets up:
// 1. DSR menu items
// 2. DSR API permissions
// 3. Assigns permissions to appropriate roles (SuperAdmin, Sales Admin, Office Admin, MIS, Distributor)
//
// Run with: node setup-dsr-complete.js

const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function setupDSRComplete() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log("🔧 Starting DSR setup...\n");

    const db = mongoose.connection.db;
    const menuCollection = db.collection("sidebar_menu_items");
    const roleMenuCollection = db.collection("role_sidebar_menu_items");
    const rolesCollection = db.collection("roles");
    const apiPermissionsCollection = db.collection("api_permissions");
    const roleApiPermissionsCollection = db.collection("role_api_permissions");

    // ===================================================================
    // STEP 1: Setup Menu Structure
    // ===================================================================
    console.log("📋 STEP 1: Setting up menu structure...");
    console.log("─".repeat(60));

    // Find or create "Distributor" parent menu
    let distributorMenu = await menuCollection.findOne({ label: "Distributor" });
    let distributorMenuId;

    if (!distributorMenu) {
      const result = await menuCollection.insertOne({
        label: "Distributor",
        href: "/distributor",
        m_order: 10,
        icon: "FaStore",
        parent_id: null,
        is_submenu: false,
      });
      distributorMenuId = result.insertedId;
      console.log("✅ Created Distributor parent menu");
    } else {
      distributorMenuId = distributorMenu._id;
      // Ensure it's properly configured as parent
      await menuCollection.updateOne(
        { _id: distributorMenuId },
        {
          $set: {
            parent_id: null,
            is_submenu: false,
            href: "/distributor",
          },
        }
      );
      console.log("✅ Updated Distributor parent menu");
    }

    // Move/Create Distributors submenu
    const distributorsMenu = await menuCollection.findOne({ label: "Distributors" });

    if (distributorsMenu) {
      await menuCollection.updateOne(
        { _id: distributorsMenu._id },
        {
          $set: {
            parent_id: distributorMenuId,
            is_submenu: true,
            href: "/distributor/distributors",
            m_order: 1,
          },
        }
      );
      console.log("✅ Updated Distributors submenu");
    } else {
      await menuCollection.insertOne({
        label: "Distributors",
        href: "/distributor/distributors",
        m_order: 1,
        icon: "FaStoreAlt",
        parent_id: distributorMenuId,
        is_submenu: true,
      });
      console.log("✅ Created Distributors submenu");
    }

    // Create/Update DSR submenu
    const dsrMenu = await menuCollection.findOne({ label: "DSR" });
    let dsrMenuId;

    if (!dsrMenu) {
      const result = await menuCollection.insertOne({
        label: "DSR",
        href: "/distributor/dsrs",
        m_order: 2,
        icon: "FaUserTie",
        parent_id: distributorMenuId,
        is_submenu: true,
      });
      dsrMenuId = result.insertedId;
      console.log("✅ Created DSR submenu");
    } else {
      dsrMenuId = dsrMenu._id;
      await menuCollection.updateOne(
        { _id: dsrMenuId },
        {
          $set: {
            parent_id: distributorMenuId,
            is_submenu: true,
            href: "/distributor/dsrs",
            m_order: 2,
          },
        }
      );
      console.log("✅ Updated DSR submenu");
    }

    // ===================================================================
    // STEP 2: Create DSR API Permissions
    // ===================================================================
    console.log("\n📋 STEP 2: Creating DSR API permissions...");
    console.log("─".repeat(60));

    const dsrPermissions = [
      { api_permissions: "dsr:create" },
      { api_permissions: "dsr:read" },
      { api_permissions: "dsr:update" },
      { api_permissions: "dsr:delete" },
      { api_permissions: "dsr:create_user" },
    ];

    const createdPermissions = [];

    for (const permData of dsrPermissions) {
      const existing = await apiPermissionsCollection.findOne({
        api_permissions: permData.api_permissions,
      });

      if (!existing) {
        const result = await apiPermissionsCollection.insertOne(permData);
        createdPermissions.push({ _id: result.insertedId, ...permData });
        console.log(`✅ Created ${permData.api_permissions}`);
      } else {
        createdPermissions.push(existing);
        console.log(`⚠️  ${permData.api_permissions} already exists`);
      }
    }

    // ===================================================================
    // STEP 3: Assign Menu Permissions to Roles
    // ===================================================================
    console.log("\n📋 STEP 3: Assigning menu access to roles...");
    console.log("─".repeat(60));

    const menuRoles = ["SuperAdmin", "Sales Admin", "Office Admin", "MIS", "Distributor"];

    for (const roleName of menuRoles) {
      const role = await rolesCollection.findOne({ role: roleName });
      if (!role) {
        console.log(`⚠️  Role ${roleName} not found, skipping...`);
        continue;
      }

      // Assign Distributor parent menu
      const existingParent = await roleMenuCollection.findOne({
        role_id: role._id,
        sidebar_menu_item_id: distributorMenuId,
      });

      if (!existingParent) {
        await roleMenuCollection.insertOne({
          role_id: role._id,
          sidebar_menu_item_id: distributorMenuId,
        });
        console.log(`✅ Assigned Distributor menu to ${roleName}`);
      }

      // Assign DSR submenu
      const existingDSR = await roleMenuCollection.findOne({
        role_id: role._id,
        sidebar_menu_item_id: dsrMenuId,
      });

      if (!existingDSR) {
        await roleMenuCollection.insertOne({
          role_id: role._id,
          sidebar_menu_item_id: dsrMenuId,
        });
        console.log(`✅ Assigned DSR menu to ${roleName}`);
      }
    }

    // ===================================================================
    // STEP 4: Assign API Permissions to Roles
    // ===================================================================
    console.log("\n📋 STEP 4: Assigning API permissions to roles...");
    console.log("─".repeat(60));

    const apiRoles = ["SuperAdmin", "Sales Admin", "Office Admin", "MIS", "Distributor"];

    for (const roleName of apiRoles) {
      const role = await rolesCollection.findOne({ role: roleName });
      if (!role) continue;

      for (const permission of createdPermissions) {
        const existing = await roleApiPermissionsCollection.findOne({
          role_id: role._id,
          api_permission_id: permission._id,
        });

        if (!existing) {
          await roleApiPermissionsCollection.insertOne({
            role_id: role._id,
            api_permission_id: permission._id,
          });
          console.log(`✅ Assigned ${permission.api_permissions} to ${roleName}`);
        }
      }
    }

    // ===================================================================
    // STEP 5: Verification Summary
    // ===================================================================
    console.log("\n" + "═".repeat(60));
    console.log("📋 SETUP COMPLETE - VERIFICATION SUMMARY");
    console.log("═".repeat(60));

    const allDistributorMenus = await menuCollection
      .find({
        $or: [{ label: "Distributor" }, { parent_id: distributorMenuId }],
      })
      .sort({ m_order: 1 })
      .toArray();

    console.log("\n🗂️  Menu Structure:");
    allDistributorMenus.forEach((item) => {
      console.log(`  ${item.is_submenu ? "  └─" : "●"} ${item.label} (${item.href || "parent"})`);
    });

    const allDSRPerms = await apiPermissionsCollection
      .find({
        api_permissions: { $regex: /^dsr:/ },
      })
      .toArray();

    console.log("\n🔑 DSR API Permissions:");
    allDSRPerms.forEach((perm) => {
      console.log(`  ✓ ${perm.api_permissions}`);
    });

    console.log("\n👥 Roles with DSR Access:");
    menuRoles.forEach((role) => {
      console.log(`  ● ${role}`);
    });

    console.log("\n✅ DSR module setup completed successfully!");
    console.log("🔄 Users may need to log out and log back in to see changes.\n");
  } catch (error) {
    console.error("\n❌ Error during setup:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

setupDSRComplete();
