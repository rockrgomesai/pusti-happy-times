const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht";

// Models
const APIPermissionSchema = new mongoose.Schema({
  action: String,
  description: String,
  active: { type: Boolean, default: true },
});

const RoleSchema = new mongoose.Schema({
  name: String,
  description: String,
  api_permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "APIPermission" }],
});

const APIPermission = mongoose.model("APIPermission", APIPermissionSchema, "api_permissions");
const Role = mongoose.model("Role", RoleSchema, "roles");

async function updateRequisitionPermissions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    // Step 1: Remove old permissions (validate and convert)
    console.log("Step 1: Removing old permissions...");
    const oldPermissions = await APIPermission.find({
      action: { $in: ["req-load-sheet:validate", "req-load-sheet:convert"] },
    });

    if (oldPermissions.length > 0) {
      console.log(`Found ${oldPermissions.length} old permission(s) to remove:`);
      oldPermissions.forEach((perm) => console.log(`  - ${perm.action}: ${perm.description}`));

      // Remove from roles
      const oldPermissionIds = oldPermissions.map((p) => p._id);
      const rolesUpdated = await Role.updateMany(
        { api_permissions: { $in: oldPermissionIds } },
        { $pull: { api_permissions: { $in: oldPermissionIds } } }
      );
      console.log(`  Removed from ${rolesUpdated.modifiedCount} role(s)`);

      // Delete old permissions
      await APIPermission.deleteMany({ _id: { $in: oldPermissionIds } });
      console.log(`  Deleted ${oldPermissions.length} old permission(s)\n`);
    } else {
      console.log("  No old permissions found\n");
    }

    // Step 2: Create or update new permissions
    console.log("Step 2: Creating/updating new permissions...");

    const newPermissions = [
      {
        action: "req-load-sheet:lock",
        description: "Lock requisition load sheet (finalize for delivery)",
      },
      {
        action: "req-load-sheet:generate-chalans",
        description: "Generate chalans and invoices from requisition load sheet",
      },
    ];

    const createdPermissions = [];

    for (const permData of newPermissions) {
      let permission = await APIPermission.findOne({ action: permData.action });

      if (!permission) {
        permission = await APIPermission.create({
          action: permData.action,
          description: permData.description,
          active: true,
        });
        console.log(`  ✓ Created: ${permission.action}`);
      } else {
        permission.description = permData.description;
        permission.active = true;
        await permission.save();
        console.log(`  ✓ Updated: ${permission.action}`);
      }

      createdPermissions.push(permission);
    }
    console.log("");

    // Step 3: Assign to relevant roles
    console.log("Step 3: Assigning permissions to roles...");

    const rolesToUpdate = [
      "Inventory Depot",
      "Inventory Factory",
      "Super Admin",
      "Admin",
    ];

    for (const roleName of rolesToUpdate) {
      const role = await Role.findOne({ name: roleName });

      if (!role) {
        console.log(`  ⚠ Role "${roleName}" not found, skipping...`);
        continue;
      }

      let updated = false;

      for (const permission of createdPermissions) {
        const hasPermission = role.api_permissions.some(
          (p) => p.toString() === permission._id.toString()
        );

        if (!hasPermission) {
          role.api_permissions.push(permission._id);
          updated = true;
        }
      }

      if (updated) {
        await role.save();
        console.log(`  ✓ Updated role: ${roleName}`);
      } else {
        console.log(`  • Role "${roleName}" already has these permissions`);
      }
    }
    console.log("");

    // Step 4: Verify the changes
    console.log("Step 4: Verification Summary");
    console.log("=" .repeat(60));

    const allReqPermissions = await APIPermission.find({
      action: { $regex: /^req-load-sheet:/ },
    }).sort({ action: 1 });

    console.log("\nAll Requisition Load Sheet Permissions:");
    allReqPermissions.forEach((perm) => {
      console.log(`  • ${perm.action}`);
      console.log(`    ${perm.description}`);
      console.log(`    Active: ${perm.active ? "Yes" : "No"}`);
    });

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
