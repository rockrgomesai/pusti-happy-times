/**
 * Create Collection Approval Permissions
 */

const mongoose = require("mongoose");
const { Role } = require("./src/models");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

const APPROVAL_PERMISSIONS = [
  {
    permission: "collection:forward",
    roles: ["ASM", "RSM", "Sales Admin", "Order Management"],
  },
  {
    permission: "collection:cancel",
    roles: ["ASM", "RSM", "Sales Admin", "Order Management", "Finance"],
  },
  {
    permission: "collection:approve",
    roles: ["Finance"],
  },
  {
    permission: "collection:edit",
    roles: ["ASM", "RSM", "Sales Admin", "Order Management", "Finance"],
  },
  {
    permission: "collection:view",
    roles: ["ASM", "RSM", "ZSM", "Sales Admin", "Order Management", "Finance"],
  },
];

async function createApprovalPermissions() {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    for (const { permission, roles } of APPROVAL_PERMISSIONS) {
      console.log(`\n📋 Processing: ${permission}`);

      // Create or find permission
      let perm = await ApiPermission.findOne({ api_permissions: permission });
      if (!perm) {
        perm = await ApiPermission.create({ api_permissions: permission });
        console.log(`   ✅ Created permission: ${perm._id}`);
      } else {
        console.log(`   ℹ️  Permission exists: ${perm._id}`);
      }

      // Assign to roles
      for (const roleName of roles) {
        const role = await Role.findOne({ role: roleName });

        if (!role) {
          console.log(`   ⚠️  Role not found: ${roleName}`);
          continue;
        }

        // Check if already assigned
        const existing = await RoleApiPermission.findOne({
          role_id: role._id,
          api_permission_id: perm._id,
        });

        if (existing) {
          console.log(`   ℹ️  Already assigned to ${roleName}`);
        } else {
          await RoleApiPermission.create({
            role_id: role._id,
            api_permission_id: perm._id,
          });
          console.log(`   ✅ Assigned to ${roleName}`);
        }
      }
    }

    console.log("\n\n🎉 All approval permissions processed!");
    console.log("\n⚠️  Users must logout and login to refresh their JWT tokens.\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createApprovalPermissions();
