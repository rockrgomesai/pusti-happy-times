/**
 * Assign Outlets Permissions to Roles
 * This script assigns outlets API permissions to the appropriate roles
 * using the RoleApiPermission junction table
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function assignOutletsPermissions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );
    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }));
    const RoleApiPermission = mongoose.model(
      "RoleApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "role_api_permissions"
    );

    // Define role-permission mappings
    const rolePermissions = {
      SuperAdmin: ["outlets:read", "outlets:create", "outlets:update", "outlets:delete"],
      "Sales Admin": ["outlets:read", "outlets:create", "outlets:update", "outlets:delete"],
      ZSM: ["outlets:read", "outlets:create", "outlets:update", "outlets:delete"],
      RSM: ["outlets:read", "outlets:create", "outlets:update", "outlets:delete"],
      ASM: ["outlets:read", "outlets:create", "outlets:update", "outlets:delete"],
      MIS: ["outlets:read", "outlets:create", "outlets:update", "outlets:delete"],
      SO: ["outlets:read", "outlets:create", "outlets:update"], // No delete
      Distributor: ["outlets:read"], // View only
      DSR: ["outlets:read"], // View only
    };

    console.log("Assigning outlets permissions to roles...\n");

    for (const [roleName, permissions] of Object.entries(rolePermissions)) {
      const role = await Role.findOne({ role: roleName });

      if (!role) {
        console.log(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      // Get permission documents - each permission is a separate document
      const permissionDocs = [];
      for (const permCode of permissions) {
        const perm = await ApiPermission.findOne({ api_permissions: permCode });
        if (perm) {
          permissionDocs.push(perm);
        } else {
          console.log(`    ⚠️  Permission not found: ${permCode}`);
        }
      }

      console.log(`    Found ${permissionDocs.length} permissions for ${roleName}`);

      if (permissionDocs.length === 0) {
        console.log(`⚠️  No permissions found for ${roleName}`);
        continue;
      }

      // Create junction table entries for each permission
      let addedCount = 0;
      for (const perm of permissionDocs) {
        // Check if entry already exists
        const existing = await RoleApiPermission.findOne({
          role_id: role._id,
          api_permission_id: perm._id,
        });

        if (!existing) {
          await RoleApiPermission.create({
            role_id: role._id,
            api_permission_id: perm._id,
          });
          addedCount++;
        }
      }

      console.log(
        `✓ Updated ${roleName}: ${addedCount} new permissions added (${permissions.join(", ")})`
      );
    }

    console.log("\n✅ All outlets permissions assigned successfully!");
  } catch (error) {
    console.error("❌ Error assigning permissions:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

assignOutletsPermissions();
