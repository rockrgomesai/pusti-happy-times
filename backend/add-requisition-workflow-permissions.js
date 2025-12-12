/**
 * Add Requisition Workflow API Permissions
 *
 * Creates API permissions for:
 * - Approved Req. Schedules (viewing scheduled requisitions)
 * - Req. Load Sheets (creating/managing load sheets)
 * - Req. Chalans (viewing/receiving chalans)
 * - Req. Invoices (viewing invoices)
 *
 * Assigns to: Inventory Depot & Inventory Factory roles
 *
 * Usage: node add-requisition-workflow-permissions.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const models = require("./src/models");

// Role IDs (verified from database)
const INVENTORY_DEPOT_ROLE_ID = "690750354bdacd1e192d1ab3";
const INVENTORY_FACTORY_ROLE_ID = "68f52ae8b9fccf467eadce90";

// API Permissions to create
const API_PERMISSIONS = [
  // Approved Req. Schedules
  { permission: "approved-req-schedules:read", description: "View approved requisition schedules" },

  // Req. Load Sheets
  { permission: "req-load-sheet:create", description: "Create requisition load sheets" },
  { permission: "req-load-sheet:read", description: "View requisition load sheets" },
  { permission: "req-load-sheet:update", description: "Edit requisition load sheets" },
  { permission: "req-load-sheet:delete", description: "Delete requisition load sheets" },
  { permission: "req-load-sheet:validate", description: "Validate/lock requisition load sheets" },
  {
    permission: "req-load-sheet:convert",
    description: "Convert load sheets to chalans & invoices",
  },

  // Req. Chalans
  { permission: "req-chalan:read", description: "View requisition chalans" },
  { permission: "req-chalan:receive", description: "Receive requisition chalans" },

  // Req. Invoices
  { permission: "req-invoice:read", description: "View requisition invoices" },
];

async function addRequisitionWorkflowPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Get roles
    const depotRole = await models.Role.findById(INVENTORY_DEPOT_ROLE_ID).lean();
    const factoryRole = await models.Role.findById(INVENTORY_FACTORY_ROLE_ID).lean();

    if (!depotRole || !factoryRole) {
      console.log("❌ Required roles not found");
      process.exit(1);
    }

    console.log("=== ADDING REQUISITION WORKFLOW PERMISSIONS ===");
    console.log("Roles:");
    console.log("  - Inventory Depot:", depotRole.role_name);
    console.log("  - Inventory Factory:", factoryRole.role_name);
    console.log();

    let createdCount = 0;
    let existingCount = 0;
    let assignedCount = 0;

    for (const { permission, description } of API_PERMISSIONS) {
      console.log(`Processing: ${permission}`);

      // 1. Create or find permission
      let apiPerm = await models.ApiPermission.findOne({
        api_permissions: permission,
      });

      if (!apiPerm) {
        apiPerm = await models.ApiPermission.create({
          api_permissions: permission,
        });
        console.log(`  ✓ Created permission: ${permission}`);
        createdCount++;
      } else {
        console.log(`  ⊘ Permission exists: ${permission}`);
        existingCount++;
      }

      // 2. Assign to Inventory Depot role
      const depotExists = await models.RoleApiPermission.findOne({
        role_id: INVENTORY_DEPOT_ROLE_ID,
        api_permission_id: apiPerm._id,
      });

      if (!depotExists) {
        await models.RoleApiPermission.create({
          role_id: INVENTORY_DEPOT_ROLE_ID,
          api_permission_id: apiPerm._id,
        });
        console.log(`  ✓ Assigned to Inventory Depot`);
        assignedCount++;
      } else {
        console.log(`  ⊘ Already assigned to Inventory Depot`);
      }

      // 3. Assign to Inventory Factory role
      const factoryExists = await models.RoleApiPermission.findOne({
        role_id: INVENTORY_FACTORY_ROLE_ID,
        api_permission_id: apiPerm._id,
      });

      if (!factoryExists) {
        await models.RoleApiPermission.create({
          role_id: INVENTORY_FACTORY_ROLE_ID,
          api_permission_id: apiPerm._id,
        });
        console.log(`  ✓ Assigned to Inventory Factory`);
        assignedCount++;
      } else {
        console.log(`  ⊘ Already assigned to Inventory Factory`);
      }

      console.log();
    }

    console.log("=== SUMMARY ===");
    console.log(`Permissions created: ${createdCount}`);
    console.log(`Permissions existing: ${existingCount}`);
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

addRequisitionWorkflowPermissions();
