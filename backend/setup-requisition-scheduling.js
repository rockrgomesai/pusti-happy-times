/**
 * Setup Script for Requisition Scheduling Module
 * Creates permissions and menu items for Distribution role
 */

require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const SidebarMenuItem = require("./src/models/SidebarMenuItem");
const Role = require("./src/models/Role");
const { RoleApiPermission, RoleSidebarMenuItem } = require("./src/models/JunctionTables");

async function setupRequisitionScheduling() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Distribution role
    const distributionRole = await Role.findOne({ role: "Distribution" });
    if (!distributionRole) {
      throw new Error("Distribution role not found");
    }
    console.log(`✅ Found Distribution role: ${distributionRole._id}`);

    // Find Inventory parent menu
    const inventoryParent = await SidebarMenuItem.findOne({
      label: "Inventory",
      parent_id: null,
    });
    if (!inventoryParent) {
      throw new Error("Inventory parent menu not found");
    }
    console.log(`✅ Found Inventory parent menu: ${inventoryParent._id}`);

    // ==========================================
    // CREATE API PERMISSIONS
    // ==========================================

    const permissionNames = [
      "requisition-scheduling:read",
      "requisition-scheduling:write",
      "requisition-scheduling:view-history",
    ];

    const createdPermissions = [];

    for (const permName of permissionNames) {
      const existing = await ApiPermission.findOne({
        api_permissions: permName,
      });

      if (existing) {
        console.log(`⚠️  Permission already exists: ${permName}`);
        createdPermissions.push(existing);
      } else {
        const newPerm = await ApiPermission.create({ api_permissions: permName });
        console.log(`✅ Created permission: ${permName} (${newPerm._id})`);
        createdPermissions.push(newPerm);
      }
    }

    // ==========================================
    // ASSIGN PERMISSIONS TO DISTRIBUTION ROLE
    // ==========================================

    for (const perm of createdPermissions) {
      const existing = await RoleApiPermission.findOne({
        role_id: distributionRole._id,
        api_permission_id: perm._id,
      });

      if (existing) {
        console.log(`⚠️  Role already has permission: ${perm.api_permissions}`);
      } else {
        await RoleApiPermission.create({
          role_id: distributionRole._id,
          api_permission_id: perm._id,
        });
        console.log(`✅ Assigned ${perm.api_permissions} to Distribution role`);
      }
    }

    // ==========================================
    // CREATE SIDEBAR MENU ITEMS (Direct MongoDB insertion)
    // ==========================================

    const menuItems = [
      {
        label: "Schedule Requisitions",
        href: "/inventory/schedule-requisitions",
        icon: "ScheduleSend",
        m_order: 410,
        parent_id: inventoryParent._id,
        is_submenu: false,
      },
      {
        label: "Req. Scheduled List",
        href: "/inventory/requisition-scheduled-list",
        icon: "PlaylistAddCheck",
        m_order: 411,
        parent_id: inventoryParent._id,
        is_submenu: false,
      },
    ];

    const createdMenuItems = [];

    for (const item of menuItems) {
      const existing = await mongoose.connection.db
        .collection("sidebar_menu_items")
        .findOne({ href: item.href });

      if (existing) {
        console.log(`⚠️  Menu item already exists: ${item.label} (${item.href})`);
        createdMenuItems.push(existing);
      } else {
        const result = await mongoose.connection.db
          .collection("sidebar_menu_items")
          .insertOne(item);
        const newItem = await mongoose.connection.db
          .collection("sidebar_menu_items")
          .findOne({ _id: result.insertedId });
        console.log(
          `✅ Created menu item: ${item.label} at order ${item.m_order} (${newItem._id})`
        );
        createdMenuItems.push(newItem);
      }
    }

    // ==========================================
    // ASSIGN MENU ITEMS TO DISTRIBUTION ROLE
    // ==========================================

    for (const menuItem of createdMenuItems) {
      const existing = await RoleSidebarMenuItem.findOne({
        role_id: distributionRole._id,
        sidebar_menu_item_id: menuItem._id,
      });

      if (existing) {
        console.log(`⚠️  Role already has menu: ${menuItem.label}`);
      } else {
        await RoleSidebarMenuItem.create({
          role_id: distributionRole._id,
          sidebar_menu_item_id: menuItem._id,
        });
        console.log(`✅ Assigned menu "${menuItem.label}" to Distribution role`);
      }
    }

    console.log("\n✅ ===================================");
    console.log("✅ Requisition Scheduling Setup Complete!");
    console.log("✅ ===================================");
    console.log("\nSummary:");
    console.log(`- Created ${createdPermissions.length} API permissions`);
    console.log(`- Created ${createdMenuItems.length} menu items`);
    console.log(`- Assigned permissions and menus to Distribution role`);
    console.log(
      "\n⚠️  IMPORTANT: Users must log out and log in again to see new permissions and menus!"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setupRequisitionScheduling();
