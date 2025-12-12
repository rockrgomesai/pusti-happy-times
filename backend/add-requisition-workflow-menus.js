/**
 * Add Requisition Workflow Menu Items
 *
 * Creates menu items for:
 * - Approved Req. Schedules (view scheduled requisitions, create load sheets)
 * - Req. Load Sheets (manage load sheets, convert to chalans)
 * - Req. Chalans & Invoices (view chalans/invoices, receive goods)
 *
 * Assigns to: Inventory Depot & Inventory Factory roles
 *
 * Mobile-first design with Material-UI icons
 *
 * Usage: node add-requisition-workflow-menus.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const models = require("./src/models");

// MongoDB URI with fallback
const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

// Role IDs (verified from database)
const INVENTORY_DEPOT_ROLE_ID = "690750354bdacd1e192d1ab3";
const INVENTORY_FACTORY_ROLE_ID = "68f52ae8b9fccf467eadce90";

// Menu items to create (mobile-first)
const MENU_ITEMS = [
  {
    label: "Approved Req. Schedules",
    href: "/inventory/approved-req-schedules",
    icon: "CheckCircle",
    m_order: 16,
    description: "View scheduled requisitions and create load sheets",
  },
  {
    label: "Req. Load Sheets",
    href: "/inventory/req-load-sheets",
    icon: "Assignment",
    m_order: 17,
    description: "Manage requisition load sheets",
  },
  {
    label: "Req. Chalans & Invoices",
    href: "/inventory/req-chalans",
    icon: "Receipt",
    m_order: 18,
    description: "View and receive requisition chalans and invoices",
  },
];

async function addRequisitionWorkflowMenus() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 Using URI:", MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")); // Hide password
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get roles
    const depotRole = await models.Role.findById(INVENTORY_DEPOT_ROLE_ID).lean();
    const factoryRole = await models.Role.findById(INVENTORY_FACTORY_ROLE_ID).lean();

    if (!depotRole || !factoryRole) {
      console.log("❌ Required roles not found");
      process.exit(1);
    }

    console.log("=== ADDING REQUISITION WORKFLOW MENUS ===");
    console.log("Roles:");
    console.log("  - Inventory Depot:", depotRole.role_name);
    console.log("  - Inventory Factory:", factoryRole.role_name);
    console.log();

    let createdCount = 0;
    let existingCount = 0;
    let assignedCount = 0;

    for (const menuData of MENU_ITEMS) {
      console.log(`Processing: ${menuData.label}`);

      // 1. Create or find menu item
      let menuItem = await models.SidebarMenuItem.findOne({
        label: menuData.label,
        href: menuData.href,
      });

      if (!menuItem) {
        menuItem = await models.SidebarMenuItem.create({
          label: menuData.label,
          href: menuData.href,
          icon: menuData.icon,
          m_order: menuData.m_order,
          parent_id: null,
          is_submenu: false,
          description: menuData.description,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  ✓ Created menu: ${menuData.label}`);
        createdCount++;
      } else {
        console.log(`  ⊘ Menu exists: ${menuData.label}`);
        existingCount++;
      }

      // 2. Assign to Inventory Depot role
      const depotExists = await models.RoleSidebarMenuItem.findOne({
        role_id: INVENTORY_DEPOT_ROLE_ID,
        sidebar_menu_item_id: menuItem._id,
      });

      if (!depotExists) {
        await models.RoleSidebarMenuItem.create({
          role_id: INVENTORY_DEPOT_ROLE_ID,
          sidebar_menu_item_id: menuItem._id,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  ✓ Assigned to Inventory Depot`);
        assignedCount++;
      } else {
        console.log(`  ⊘ Already assigned to Inventory Depot`);
      }

      // 3. Assign to Inventory Factory role
      const factoryExists = await models.RoleSidebarMenuItem.findOne({
        role_id: INVENTORY_FACTORY_ROLE_ID,
        sidebar_menu_item_id: menuItem._id,
      });

      if (!factoryExists) {
        await models.RoleSidebarMenuItem.create({
          role_id: INVENTORY_FACTORY_ROLE_ID,
          sidebar_menu_item_id: menuItem._id,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  ✓ Assigned to Inventory Factory`);
        assignedCount++;
      } else {
        console.log(`  ⊘ Already assigned to Inventory Factory`);
      }

      console.log();
    }

    console.log("=== SUMMARY ===");
    console.log(`Menus created: ${createdCount}`);
    console.log(`Menus existing: ${existingCount}`);
    console.log(`Role assignments: ${assignedCount}`);
    console.log(
      "\n✅ DONE! Users with Inventory Depot or Inventory Factory roles must logout and login."
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addRequisitionWorkflowMenus();
