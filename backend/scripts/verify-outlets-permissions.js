/**
 * Verification Script: Check Outlets API Permissions
 *
 * This script verifies that the outlets API permissions are properly
 * configured in the database for all roles.
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function verifyOutletsPermissions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false })
    );
    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }));

    // Check if outlets permissions exist
    console.log("Checking Outlets API Permissions...\n");

    const outletsPermissions = await ApiPermission.find({
      api_permissions: { $regex: /^outlets:/ },
    }).sort({ api_permissions: 1 });

    console.log(`Found ${outletsPermissions.length} outlets permissions:`);
    outletsPermissions.forEach((perm) => {
      console.log(`  - ${perm.api_permissions}: ${perm.description || "No description"}`);
    });

    if (outletsPermissions.length === 0) {
      console.log("\n⚠️  WARNING: No outlets permissions found!");
      console.log("   Run the outlets permissions creation script first.");
    }

    // Check roles with outlets permissions
    console.log("\n\nChecking Roles with Outlets Permissions...\n");

    const outletsPermissionIds = outletsPermissions.map((p) => p._id);

    const rolesWithOutletsAccess = await Role.find({
      api_permissions: { $in: outletsPermissionIds },
    }).populate("api_permissions");

    if (rolesWithOutletsAccess.length > 0) {
      console.log(`Found ${rolesWithOutletsAccess.length} roles with outlets access:`);
      rolesWithOutletsAccess.forEach((role) => {
        const outletsPerms = role.api_permissions
          .filter((p) => p.api_permissions && p.api_permissions.startsWith("outlets:"))
          .map((p) => p.api_permissions);
        console.log(`\n  ${role.role}:`);
        outletsPerms.forEach((perm) => console.log(`    - ${perm}`));
      });
    } else {
      console.log("⚠️  WARNING: No roles have outlets permissions assigned!");
      console.log("   Run the role-permissions assignment script.");
    }

    console.log("\n\n✅ Verification completed!");
  } catch (error) {
    console.error("❌ Error during verification:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

// Run the verification
verifyOutletsPermissions();
