const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { ApiPermission } = require("../src/models/Permission");
const Role = require("../src/models/Role");
const { RoleApiPermission } = require("../src/models/JunctionTables");

const routesPermissions = [
  { api_permissions: "routes:read" },
  { api_permissions: "routes:create" },
  { api_permissions: "routes:update" },
  { api_permissions: "routes:delete" },
];

const fullAccessRoles = ["SuperAdmin", "MIS", "SalesAdmin"];
const readOnlyRoles = ["ZSM", "RSM", "ASM"];

async function addRoutesPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create permissions
    console.log("\n📋 Creating route permissions...");
    const createdPermissions = [];

    for (const perm of routesPermissions) {
      const existing = await ApiPermission.findOne({ api_permissions: perm.api_permissions });
      if (existing) {
        console.log(`   ✓ Permission already exists: ${perm.api_permissions}`);
        createdPermissions.push(existing);
      } else {
        const newPerm = await ApiPermission.create(perm);
        console.log(`   ✓ Created permission: ${perm.api_permissions}`);
        createdPermissions.push(newPerm);
      }
    }

    // Assign full access to SuperAdmin, MIS, SalesAdmin
    console.log("\n🔑 Assigning full access permissions...");
    for (const roleName of fullAccessRoles) {
      const role = await Role.findOne({ role: roleName });
      if (!role) {
        console.log(`   ⚠️ Role not found: ${roleName}`);
        continue;
      }

      for (const permission of createdPermissions) {
        const existing = await RoleApiPermission.findOne({
          role_id: role._id,
          api_permission_id: permission._id,
        });

        if (!existing) {
          await RoleApiPermission.create({
            role_id: role._id,
            api_permission_id: permission._id,
          });
          console.log(`   ✓ Assigned ${permission.api_permissions} to ${roleName}`);
        }
      }
    }

    // Assign read-only access to ZSM, RSM, ASM
    console.log("\n👁️ Assigning read-only permissions...");
    const readPermission = createdPermissions.find((p) => p.api_permissions === "routes:read");

    for (const roleName of readOnlyRoles) {
      const role = await Role.findOne({ role: roleName });
      if (!role) {
        console.log(`   ⚠️ Role not found: ${roleName}`);
        continue;
      }

      const existing = await RoleApiPermission.findOne({
        role_id: role._id,
        api_permission_id: readPermission._id,
      });

      if (!existing) {
        await RoleApiPermission.create({
          role_id: role._id,
          api_permission_id: readPermission._id,
        });
        console.log(`   ✓ Assigned routes:read to ${roleName}`);
      }
    }

    console.log("\n✅ Routes permissions added successfully!");
    console.log("\nSummary:");
    console.log(`   - ${createdPermissions.length} permissions created`);
    console.log(`   - Full access: ${fullAccessRoles.join(", ")}`);
    console.log(`   - Read-only: ${readOnlyRoles.join(", ")}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding routes permissions:", error);
    process.exit(1);
  }
}

addRoutesPermissions();
