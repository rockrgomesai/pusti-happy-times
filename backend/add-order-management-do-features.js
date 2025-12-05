/**
 * Add DO List features to Order Management role
 * - Menu items (DO List, My DO List)
 * - API permissions (do-list:read, my-do-list:read, etc.)
 *
 * Usage: node add-order-management-do-features.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Models
const models = require("./src/models");
const Role = models.Role;
const SidebarMenuItem = models.SidebarMenuItem;
const RoleSidebarMenuItem = models.RoleSidebarMenuItem;
const ApiPermission = models.ApiPermission;
const RoleApiPermission = models.RoleApiPermission;

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ MongoDB connected");
  } catch (error) {
    console.error("✗ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Menu items to assign
const menuItemPaths = ["/demandorder/do-list", "/demandorder/my-do-list"];

// API permissions to assign
const apiPermissionNames = [
  "do-list:read",
  "my-do-list:read",
  "do-list:view-history",
  "do-list:search",
];

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Adding DO Features to Order Management Role ===\n");

    // Find Order Management role
    const orderMgmtRole = await Role.findOne({ role: "Order Management" });
    if (!orderMgmtRole) {
      console.error("✗ Order Management role not found");
      console.log("\nAvailable roles:");
      const allRoles = await Role.find({}).select("role name");
      allRoles.forEach((r) => console.log(`  - ${r.role || r.name}`));
      process.exit(1);
    }

    console.log(`✓ Found Order Management role`);
    console.log(`  ID: ${orderMgmtRole._id}`);
    console.log(`  Name: ${orderMgmtRole.name || orderMgmtRole.role}\n`);

    // === MENU ITEMS ===
    console.log("=== Assigning Menu Items ===\n");

    for (const menuPath of menuItemPaths) {
      const menuItem = await SidebarMenuItem.findOne({ href: menuPath });

      if (!menuItem) {
        console.log(`✗ Menu item not found: ${menuPath}`);
        continue;
      }

      const existing = await RoleSidebarMenuItem.findOne({
        role_id: orderMgmtRole._id,
        sidebar_menu_item_id: menuItem._id,
      });

      if (!existing) {
        await RoleSidebarMenuItem.create({
          role_id: orderMgmtRole._id,
          sidebar_menu_item_id: menuItem._id,
        });
        console.log(`✓ Assigned menu: ${menuItem.label} (${menuPath})`);
      } else {
        console.log(`  Already has menu: ${menuItem.label}`);
      }
    }

    // === API PERMISSIONS ===
    console.log("\n=== Assigning API Permissions ===\n");

    for (const permName of apiPermissionNames) {
      const permission = await ApiPermission.findOne({
        api_permissions: permName,
      });

      if (!permission) {
        console.log(`✗ Permission not found: ${permName}`);
        continue;
      }

      const existing = await RoleApiPermission.findOne({
        role_id: orderMgmtRole._id,
        api_permission_id: permission._id,
      });

      if (!existing) {
        await RoleApiPermission.create({
          role_id: orderMgmtRole._id,
          api_permission_id: permission._id,
        });
        console.log(`✓ Assigned permission: ${permName}`);
      } else {
        console.log(`  Already has permission: ${permName}`);
      }
    }

    // === SUMMARY ===
    console.log("\n=== Summary ===\n");

    const totalMenus = await RoleSidebarMenuItem.countDocuments({
      role_id: orderMgmtRole._id,
    });

    const totalPermissions = await RoleApiPermission.countDocuments({
      role_id: orderMgmtRole._id,
    });

    console.log(`Order Management Role:`);
    console.log(`  - ${totalMenus} menu items`);
    console.log(`  - ${totalPermissions} API permissions`);

    // Show DO-related menu items
    const doMenus = await RoleSidebarMenuItem.find({
      role_id: orderMgmtRole._id,
    })
      .populate("sidebar_menu_item_id")
      .lean();

    const doMenuItems = doMenus
      .map((rm) => rm.sidebar_menu_item_id)
      .filter((menu) => menu && menu.href && menu.href.includes("/demandorder/"));

    if (doMenuItems.length > 0) {
      console.log(`\nDO-related menus:`);
      doMenuItems.forEach((menu) => {
        console.log(`  - ${menu.label} → ${menu.href}`);
      });
    }

    console.log("\n✓ Order Management DO features setup complete!\n");

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
