/**
 * Script to add Depot Transfer API Permissions and Menu Items
 * Run: node create-depot-transfer-permissions.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function createDepotTransferPermissionsAndMenus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Import models
    const { ApiPermission } = require("./src/models/Permission");
    const { Role } = require("./src/models");
    const { RoleApiPermission, RoleSidebarMenuItem } = require("./src/models/JunctionTables");

    // Define simplified SidebarMenuItem model
    let SidebarMenuItem;
    try {
      SidebarMenuItem = mongoose.model("SidebarMenuItem");
    } catch (error) {
      SidebarMenuItem = mongoose.model(
        "SidebarMenuItem",
        new mongoose.Schema({
          label: String,
          href: String,
          icon: String,
          parent_id: mongoose.Schema.Types.ObjectId,
          order: Number,
          active: Boolean,
        })
      );
    }

    // 1. Create API Permissions
    const permissions = ["depot-transfer:create", "depot-transfer:read", "depot-transfer:receive"];

    console.log("\n📝 Creating API Permissions...");
    const createdPermissions = [];
    for (const permName of permissions) {
      const existing = await ApiPermission.findOne({ api_permissions: permName });
      if (existing) {
        console.log(`   ⏭️  Permission "${permName}" already exists`);
        createdPermissions.push(existing);
      } else {
        const newPerm = await ApiPermission.create({ api_permissions: permName });
        console.log(`   ✅ Created permission: ${permName}`);
        createdPermissions.push(newPerm);
      }
    }

    // 2. Find or create Inventory parent menu
    console.log("\n📝 Finding Inventory parent menu...");
    let inventoryParent = await SidebarMenuItem.findOne({ label: "Inventory", parent_id: null });
    if (!inventoryParent) {
      inventoryParent = await SidebarMenuItem.create({
        label: "Inventory",
        icon: "FaWarehouse",
        href: null,
        parent_id: null,
        is_submenu: false,
        m_order: 50,
      });
      console.log("   ✅ Created Inventory parent menu");
    } else {
      console.log("   ✅ Found existing Inventory parent menu");
    }

    // 3. Create Menu Items
    const menuItems = [
      {
        title: "Transfer Send",
        label: "Transfer Send",
        icon: "FaPaperPlane",
        href: "/inventory/transfer-send",
        parent_id: inventoryParent._id,
        is_submenu: true,
        m_order: 401,
        createdBy: "system",
        updatedBy: "system",
      },
      {
        title: "Transfer Send List",
        label: "Transfer Send List",
        icon: "FaList",
        href: "/inventory/transfer-send-list",
        parent_id: inventoryParent._id,
        is_submenu: true,
        m_order: 402,
        createdBy: "system",
        updatedBy: "system",
      },
      {
        title: "Transfer Receive",
        label: "Transfer Receive",
        icon: "FaDownload",
        href: "/inventory/transfer-receive",
        parent_id: inventoryParent._id,
        is_submenu: true,
        m_order: 403,
        createdBy: "system",
        updatedBy: "system",
      },
      {
        title: "Transfer Receive List",
        label: "Transfer Receive List",
        icon: "FaClipboardList",
        href: "/inventory/transfer-receive-list",
        parent_id: inventoryParent._id,
        is_submenu: true,
        m_order: 404,
        createdBy: "system",
        updatedBy: "system",
      },
    ];

    console.log("\n📝 Creating Menu Items...");
    const createdMenus = [];
    const menuCollection = mongoose.connection.collection("sidebar_menu_items");

    for (const menu of menuItems) {
      const existing = await menuCollection.findOne({ href: menu.href });
      if (existing) {
        console.log(`   ⏭️  Menu "${menu.label}" already exists`);
        createdMenus.push(existing);
      } else {
        const result = await menuCollection.insertOne(menu);
        const newMenu = await menuCollection.findOne({ _id: result.insertedId });
        console.log(`   ✅ Created menu: ${menu.label}`);
        createdMenus.push(newMenu);
      }
    }

    // 4. Assign to "Inventory Depot" role
    const inventoryDepotRole = await Role.findOne({ role: "Inventory Depot" });
    if (!inventoryDepotRole) {
      console.log("\n⚠️  'Inventory Depot' role not found. Please create it first.");
    } else {
      console.log(`\n📝 Assigning permissions and menus to 'Inventory Depot' role...`);

      // Assign API Permissions
      for (const perm of createdPermissions) {
        const existing = await RoleApiPermission.findOne({
          role_id: inventoryDepotRole._id,
          api_permission_id: perm._id,
        });
        if (!existing) {
          await RoleApiPermission.create({
            role_id: inventoryDepotRole._id,
            api_permission_id: perm._id,
          });
          console.log(`   ✅ Assigned permission: ${perm.name}`);
        } else {
          console.log(`   ⏭️  Permission already assigned: ${perm.name}`);
        }
      }

      // Assign Menu Items
      for (const menu of createdMenus) {
        const existing = await RoleSidebarMenuItem.findOne({
          role_id: inventoryDepotRole._id,
          sidebar_menu_item_id: menu._id,
        });
        if (!existing) {
          await RoleSidebarMenuItem.create({
            role_id: inventoryDepotRole._id,
            sidebar_menu_item_id: menu._id,
          });
          console.log(`   ✅ Assigned menu: ${menu.label}`);
        } else {
          console.log(`   ⏭️  Menu already assigned: ${menu.label}`);
        }
      }
    }

    console.log("\n✅ Depot Transfer setup completed successfully!");
    console.log("\nCreated/Updated:");
    console.log(`  - ${createdPermissions.length} API Permissions`);
    console.log(`  - ${createdMenus.length} Menu Items`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

createDepotTransferPermissionsAndMenus();
