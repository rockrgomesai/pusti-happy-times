/**
 * Check inventorymanagerpapaya user's role and menu access
 *
 * Usage: node check-inventory-manager-access.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Models
const models = require("./src/models");
const User = models.User;
const Role = models.Role;
const RoleSidebarMenuItem = models.RoleSidebarMenuItem;
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

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Checking inventorymanagerpapaya User Access ===\n");

    // Find user
    const user = await User.findOne({ username: "inventorymanagerpapaya" })
      .populate("role_id")
      .lean();

    if (!user) {
      console.error("✗ User 'inventorymanagerpapaya' not found");
      process.exit(1);
    }

    console.log(`User: ${user.username}`);
    console.log(`Name: ${user.first_name} ${user.last_name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role_id?.role || "N/A"}`);
    console.log(`Role ID: ${user.role_id?._id}\n`);

    if (!user.role_id) {
      console.error("✗ User has no role assigned");
      process.exit(1);
    }

    const roleId = user.role_id._id;

    // Get menu items
    console.log("=== Menu Items ===\n");
    const roleMenuItems = await RoleSidebarMenuItem.find({
      role_id: roleId,
    })
      .populate("sidebar_menu_item_id")
      .lean();

    const menuItems = roleMenuItems
      .map((rm) => rm.sidebar_menu_item_id)
      .filter(Boolean)
      .sort((a, b) => (a.m_order || 0) - (b.m_order || 0));

    console.log(`Total menu items: ${menuItems.length}\n`);

    // Categorize menus
    const categories = {
      finance: [],
      loadSheet: [],
      chalan: [],
      delivery: [],
      demandOrder: [],
      other: [],
    };

    menuItems.forEach((menu) => {
      const href = menu.href || "";
      const label = menu.label || "";

      if (href.includes("final-approval") || label.toLowerCase().includes("final approval")) {
        categories.finance.push(menu);
      } else if (href.includes("loadsheet") || href.includes("load-sheet")) {
        categories.loadSheet.push(menu);
      } else if (href.includes("chalan") || href.includes("challan")) {
        categories.chalan.push(menu);
      } else if (href.includes("delivery") || href.includes("invoice")) {
        categories.delivery.push(menu);
      } else if (href.includes("demandorder") || href.includes("do-list")) {
        categories.demandOrder.push(menu);
      } else {
        categories.other.push(menu);
      }
    });

    console.log("Finance/Final Approval Menus:");
    if (categories.finance.length > 0) {
      categories.finance.forEach((m) => console.log(`  ✓ ${m.label} → ${m.href}`));
    } else {
      console.log("  (none)");
    }

    console.log("\nLoad Sheet Menus:");
    if (categories.loadSheet.length > 0) {
      categories.loadSheet.forEach((m) => console.log(`  ✓ ${m.label} → ${m.href}`));
    } else {
      console.log("  (none)");
    }

    console.log("\nChalan/Challan Menus:");
    if (categories.chalan.length > 0) {
      categories.chalan.forEach((m) => console.log(`  ✓ ${m.label} → ${m.href}`));
    } else {
      console.log("  (none)");
    }

    console.log("\nDelivery/Invoice Menus:");
    if (categories.delivery.length > 0) {
      categories.delivery.forEach((m) => console.log(`  ✓ ${m.label} → ${m.href}`));
    } else {
      console.log("  (none)");
    }

    console.log("\nDemand Order Menus:");
    if (categories.demandOrder.length > 0) {
      categories.demandOrder.forEach((m) => console.log(`  ✓ ${m.label} → ${m.href}`));
    } else {
      console.log("  (none)");
    }

    console.log("\nAll Other Menus:");
    if (categories.other.length > 0) {
      categories.other.forEach((m) => console.log(`  - ${m.label} → ${m.href}`));
    } else {
      console.log("  (none)");
    }

    // Get API permissions
    console.log("\n=== API Permissions ===\n");
    const roleApiPermissions = await RoleApiPermission.find({
      role_id: roleId,
    })
      .populate("api_permission_id")
      .lean();

    const permissions = roleApiPermissions.map((rp) => rp.api_permission_id).filter(Boolean);

    console.log(`Total API permissions: ${permissions.length}`);

    // Check for problematic permissions
    const financePerms = permissions.filter(
      (p) =>
        p.api_permissions?.includes("final-approval") || p.api_permissions?.includes("schedule")
    );
    const loadSheetPerms = permissions.filter((p) => p.api_permissions?.includes("loadsheet"));
    const chalanPerms = permissions.filter(
      (p) => p.api_permissions?.includes("chalan") || p.api_permissions?.includes("challan")
    );
    const deliveryPerms = permissions.filter(
      (p) => p.api_permissions?.includes("delivery") || p.api_permissions?.includes("invoice")
    );

    console.log(`  Finance/Schedule permissions: ${financePerms.length}`);
    console.log(`  Load Sheet permissions: ${loadSheetPerms.length}`);
    console.log(`  Chalan permissions: ${chalanPerms.length}`);
    console.log(`  Delivery permissions: ${deliveryPerms.length}`);

    console.log("\n=== Summary ===\n");
    console.log(`Role: ${user.role_id.role}`);
    console.log(`Issue: User sees Finance, Load Sheet, Chalan, and Delivery menus`);
    console.log(`Expected: Inventory Manager should see inventory-related menus only\n`);

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
