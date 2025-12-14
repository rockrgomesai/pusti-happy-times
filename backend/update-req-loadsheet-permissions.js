/**
 * Update Requisition Load Sheet Permissions
 * 
 * This script updates API permissions for the requisition load sheet module:
 * - Removes old permissions: req-load-sheet:validate, req-load-sheet:convert
 * - Adds new permissions: req-load-sheet:lock, req-load-sheet:generate-chalans
 * - Assigns permissions to relevant roles
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht";

// Define Schemas and Models
const apiPermissionSchema = new mongoose.Schema(
  {
    api_permissions: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "api_permissions",
  }
);

const roleApiPermissionSchema = new mongoose.Schema(
  {
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    api_permission_id: { type: mongoose.Schema.Types.ObjectId, ref: "ApiPermission", required: true },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "role_api_permissions",
  }
);

const roleSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "roles",
  }
);

const APIPermission = mongoose.model("ApiPermission", apiPermissionSchema);
const RoleApiPermission = mongoose.model("RoleApiPermission", roleApiPermissionSchema);
const Role = mongoose.model("Role", roleSchema);

async function updateRequisitionPermissions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    // Step 1: Remove old permissions
    console.log("Step 1: Removing old permissions...");
    const oldPermNames = ["req-load-sheet:validate", "req-load-sheet:convert"];
    const oldPermissions = await APIPermission.find({
      api_permissions: { $in: oldPermNames },
    });

    if (oldPermissions.length > 0) {
      console.log(`Found ${oldPermissions.length} old permission(s) to remove:`);
      oldPermissions.forEach((perm) => console.log(`  - ${perm.api_permissions}`));

      // Remove from role_api_permissions junction table
      const oldPermissionIds = oldPermissions.map((p) => p._id);
      const junctionsDeleted = await RoleApiPermission.deleteMany({
        api_permission_id: { $in: oldPermissionIds },
      });
      console.log(`  Removed ${junctionsDeleted.deletedCount} role-permission link(s)`);

      // Delete old permissions
      await APIPermission.deleteMany({ _id: { $in: oldPermissionIds } });
      console.log(`  Deleted ${oldPermissions.length} old permission(s)\n`);
    } else {
      console.log("  No old permissions found\n");
    }

    // Step 2: Create new permissions
    console.log("Step 2: Creating/updating new permissions...");
    const newPermNames = ["req-load-sheet:lock", "req-load-sheet:generate-chalans"];
    const createdPermissions = [];

    for (const permName of newPermNames) {
      let permission = await APIPermission.findOne({ api_permissions: permName });

      if (!permission) {
        permission = await APIPermission.create({ api_permissions: permName });
        console.log(`  ✓ Created: ${permission.api_permissions}`);
      } else {
        console.log(`  • Already exists: ${permission.api_permissions}`);
      }

      createdPermissions.push(permission);
    }
    console.log("");

    // Step 3: Assign to relevant roles
    console.log("Step 3: Assigning permissions to roles...");
    const rolesToUpdate = ["Inventory Depot", "Inventory Factory", "Super Admin", "Admin"];

    for (const roleName of rolesToUpdate) {
      const role = await Role.findOne({ name: roleName });

      if (!role) {
        console.log(`  ⚠ Role "${roleName}" not found, skipping...`);
        continue;
      }

      let added = 0;

      for (const permission of createdPermissions) {
        // Check if junction already exists
        const exists = await RoleApiPermission.findOne({
          role_id: role._id,
          api_permission_id: permission._id,
        });

        if (!exists) {
          await RoleApiPermission.create({
            role_id: role._id,
            api_permission_id: permission._id,
          });
          added++;
        }
      }

      if (added > 0) {
        console.log(`  ✓ Added ${added} permission(s) to role: ${roleName}`);
      } else {
        console.log(`  • Role "${roleName}" already has these permissions`);
      }
    }
    console.log("");

    // Step 4: Verification
    console.log("Step 4: Verification Summary");
    console.log("=".repeat(60));

    const allReqPermissions = await APIPermission.find({
      api_permissions: { $regex: /^req-load-sheet:/ },
    }).sort({ api_permissions: 1 });

    console.log("\nAll Requisition Load Sheet Permissions:");
    for (const perm of allReqPermissions) {
      const roleCount = await RoleApiPermission.countDocuments({
        api_permission_id: perm._id,
      });
      console.log(`  • ${perm.api_permissions} (assigned to ${roleCount} role(s))`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("Permission update completed successfully!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Error updating permissions:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\nMongoDB connection closed");
  }
}

// Run the script
updateRequisitionPermissions()
  .then(() => {
    console.log("\n✓ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Script failed:", error.message);
    process.exit(1);
  });
