/**
 * Add Distribution workflow menu items to Inventory Depot role
 * After Finance approves schedules, Depot needs to:
 * - View approved schedules
 * - Create Load Sheets
 * - Generate Chalan/Invoice
 * - Manage Delivery
 *
 * Usage: node add-depot-distribution-features.js
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

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Adding Distribution Workflow Features to Inventory Depot ===\n");

    // Find Inventory Depot role
    const depotRole = await Role.findOne({ role: "Inventory Depot" });
    if (!depotRole) {
      console.error("✗ Inventory Depot role not found");
      console.log("\nAvailable roles:");
      const allRoles = await Role.find({}).select("role name");
      allRoles.forEach((r) => console.log(`  - ${r.role || r.name}`));
      process.exit(1);
    }

    console.log(`✓ Found Inventory Depot role`);
    console.log(`  ID: ${depotRole._id}\n`);

    // Get all available menu items to find the correct paths
    console.log("=== Searching for Distribution Workflow Menus ===\n");

    const allMenus = await SidebarMenuItem.find({}).lean();

    // Find menus related to the workflow
    const workflowMenus = allMenus.filter((menu) => {
      const href = menu.href || "";
      const label = (menu.label || "").toLowerCase();

      return (
        href.includes("schedule") ||
        href.includes("loadsheet") ||
        href.includes("load-sheet") ||
        href.includes("chalan") ||
        href.includes("challan") ||
        href.includes("delivery") ||
        href.includes("invoice") ||
        label.includes("schedule") ||
        label.includes("load") ||
        label.includes("chalan") ||
        label.includes("delivery") ||
        label.includes("invoice")
      );
    });

    console.log(`Found ${workflowMenus.length} distribution workflow menus:\n`);
    workflowMenus.forEach((menu) => {
      console.log(`  - ${menu.label} → ${menu.href}`);
    });

    // === ASSIGN MENU ITEMS ===
    console.log("\n=== Assigning Menu Items to Inventory Depot ===\n");

    for (const menu of workflowMenus) {
      const existing = await RoleSidebarMenuItem.findOne({
        role_id: depotRole._id,
        sidebar_menu_item_id: menu._id,
      });

      if (!existing) {
        await RoleSidebarMenuItem.create({
          role_id: depotRole._id,
          sidebar_menu_item_id: menu._id,
        });
        console.log(`✓ Assigned: ${menu.label} (${menu.href})`);
      } else {
        console.log(`  Already has: ${menu.label}`);
      }
    }

    // === ASSIGN API PERMISSIONS ===
    console.log("\n=== Assigning API Permissions ===\n");

    const allPermissions = await ApiPermission.find({}).lean();

    const workflowPermissions = allPermissions.filter((perm) => {
      const apiPerm = perm.api_permissions || "";
      return (
        apiPerm.includes("schedule") ||
        apiPerm.includes("loadsheet") ||
        apiPerm.includes("load-sheet") ||
        apiPerm.includes("chalan") ||
        apiPerm.includes("challan") ||
        apiPerm.includes("delivery") ||
        apiPerm.includes("invoice")
      );
    });

    console.log(`Found ${workflowPermissions.length} workflow-related permissions\n`);

    for (const perm of workflowPermissions) {
      const existing = await RoleApiPermission.findOne({
        role_id: depotRole._id,
        api_permission_id: perm._id,
      });

      if (!existing) {
        await RoleApiPermission.create({
          role_id: depotRole._id,
          api_permission_id: perm._id,
        });
        console.log(`✓ Assigned: ${perm.api_permissions}`);
      } else {
        console.log(`  Already has: ${perm.api_permissions}`);
      }
    }

    // === SUMMARY ===
    console.log("\n=== Summary ===\n");

    const totalMenus = await RoleSidebarMenuItem.countDocuments({
      role_id: depotRole._id,
    });

    const totalPermissions = await RoleApiPermission.countDocuments({
      role_id: depotRole._id,
    });

    console.log(`Inventory Depot Role:`);
    console.log(`  - ${totalMenus} menu items (was 16)`);
    console.log(`  - ${totalPermissions} API permissions (was 19)`);

    // Show newly added workflow menus
    const depotMenus = await RoleSidebarMenuItem.find({
      role_id: depotRole._id,
    })
      .populate("sidebar_menu_item_id")
      .lean();

    const newWorkflowMenus = depotMenus
      .map((rm) => rm.sidebar_menu_item_id)
      .filter((menu) => {
        if (!menu || !menu.href) return false;
        const href = menu.href;
        return (
          href.includes("schedule") ||
          href.includes("loadsheet") ||
          href.includes("chalan") ||
          href.includes("delivery") ||
          href.includes("invoice")
        );
      });

    if (newWorkflowMenus.length > 0) {
      console.log(`\nDistribution Workflow Menus:`);
      newWorkflowMenus.forEach((menu) => {
        console.log(`  - ${menu.label} → ${menu.href}`);
      });
    }

    console.log("\n✓ Inventory Depot distribution workflow setup complete!\n");
    console.log("Workflow: Finance Approval → Depot (Load Sheet → Chalan → Delivery)\n");

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
