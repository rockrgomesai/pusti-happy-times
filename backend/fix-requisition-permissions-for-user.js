/**
 * Fix Requisition Workflow Permissions for Current User
 * Finds user's role and assigns the requisition workflow permissions
 *
 * Usage: node fix-requisition-permissions-for-user.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const models = require("./src/models");

// MongoDB URI with fallback
const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

// User ID from logs
const USER_ID = "6937c4cb3b542fb84ae72666";

// Permission codes to assign
const PERMISSION_CODES = [
  "approved-req-schedules:read",
  "req-load-sheet:create",
  "req-load-sheet:read",
  "req-load-sheet:update",
  "req-load-sheet:delete",
  "req-load-sheet:validate",
  "req-load-sheet:convert",
  "req-chalan:read",
  "req-chalan:receive",
  "req-invoice:read",
];

async function fixPermissions() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 Using URI:", MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@"));
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find user
    console.log(`🔍 Finding user: ${USER_ID}`);
    const user = await models.User.findById(USER_ID).populate("role_id", "role");
    
    if (!user) {
      throw new Error("User not found");
    }

    console.log(`✅ User found: ${user.username} (${user.full_name})`);
    console.log(`📋 Role: ${user.role_id.role} (ID: ${user.role_id._id})`);
    console.log(`🏢 Facility: ${user.facility_id}\n`);

    const roleId = user.role_id._id;

    // Find all requisition workflow permissions
    console.log("🔍 Finding requisition workflow API permissions...");
    const apiPermissions = await models.ApiPermission.find({
      permission: { $in: PERMISSION_CODES },
    });

    console.log(`✅ Found ${apiPermissions.length} API permissions\n`);

    if (apiPermissions.length === 0) {
      console.log("⚠️  No API permissions found. Creating them first...\n");
      
      const permissionsToCreate = [
        { permission: "approved-req-schedules:read", description: "View approved requisition schedules" },
        { permission: "req-load-sheet:create", description: "Create requisition load sheets" },
        { permission: "req-load-sheet:read", description: "View requisition load sheets" },
        { permission: "req-load-sheet:update", description: "Edit requisition load sheets" },
        { permission: "req-load-sheet:delete", description: "Delete requisition load sheets" },
        { permission: "req-load-sheet:validate", description: "Validate/lock requisition load sheets" },
        { permission: "req-load-sheet:convert", description: "Convert load sheets to chalans & invoices" },
        { permission: "req-chalan:read", description: "View requisition chalans" },
        { permission: "req-chalan:receive", description: "Receive requisition chalans" },
        { permission: "req-invoice:read", description: "View requisition invoices" },
      ];

      for (const perm of permissionsToCreate) {
        const existing = await models.ApiPermission.findOne({ permission: perm.permission });
        if (!existing) {
          await models.ApiPermission.create(perm);
          console.log(`  ✅ Created: ${perm.permission}`);
        } else {
          console.log(`  ⏭️  Already exists: ${perm.permission}`);
        }
      }

      // Re-fetch after creation
      const newApiPermissions = await models.ApiPermission.find({
        permission: { $in: PERMISSION_CODES },
      });
      apiPermissions.push(...newApiPermissions);
    }

    // Assign permissions to role
    console.log(`\n📝 Assigning permissions to role: ${user.role_id.role}...`);
    
    let assigned = 0;
    let skipped = 0;

    for (const apiPerm of apiPermissions) {
      const existing = await models.RoleApiPermission.findOne({
        role_id: roleId,
        api_permission_id: apiPerm._id,
      });

      if (existing) {
        console.log(`  ⏭️  ${apiPerm.permission} - already assigned`);
        skipped++;
      } else {
        await models.RoleApiPermission.create({
          role_id: roleId,
          api_permission_id: apiPerm._id,
        });
        console.log(`  ✅ ${apiPerm.permission} - assigned`);
        assigned++;
      }
    }

    console.log(`\n✅ Complete!`);
    console.log(`   - ${assigned} permissions assigned`);
    console.log(`   - ${skipped} permissions already existed`);
    console.log(`\n🎉 User ${user.username} can now access requisition workflow features!`);
    console.log(`\n📝 Note: User may need to logout and login again for changes to take effect.`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

fixPermissions();
