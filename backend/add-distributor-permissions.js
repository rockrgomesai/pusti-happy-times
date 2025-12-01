/**
 * Script to add API permissions for Distributor role
 * 
 * This script creates permissions for:
 * - Receiving chalans from depot
 * - Viewing distributor stock
 * - Viewing received chalan history
 * 
 * IMPORTANT: Uses roles.role field (NOT roles.name)
 * 
 * Usage: node add-distributor-permissions.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Models
const models = require("./src/models");
const Role = models.Role;
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

// Permissions to create
const permissions = [
  {
    api_permissions: "distributor-chalan:read",
  },
  {
    api_permissions: "distributor-chalan:receive",
  },
  {
    api_permissions: "distributor-stock:read",
  },
];

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Adding Distributor Permissions ===\n");

    // Find Distributor role (using roles.role field)
    const distributorRole = await Role.findOne({ role: "Distributor" });
    if (!distributorRole) {
      console.error("✗ Distributor role not found");
      console.log("  Please ensure a role with role='Distributor' exists");
      process.exit(1);
    }
    console.log(`✓ Found Distributor role: ${distributorRole.name} (${distributorRole.role})`);

    // Create or find permissions
    const createdPermissions = [];
    for (const perm of permissions) {
      let apiPermission = await ApiPermission.findOne({ api_permissions: perm.api_permissions });
      
      if (!apiPermission) {
        apiPermission = await ApiPermission.create({
          api_permissions: perm.api_permissions,
        });
        console.log(`✓ Created permission: ${perm.api_permissions}`);
      } else {
        console.log(`  Permission already exists: ${perm.api_permissions}`);
      }
      
      createdPermissions.push(apiPermission);
    }

    // Assign permissions to Distributor role
    console.log("\n--- Assigning Permissions to Distributor Role ---\n");
    
    for (const permission of createdPermissions) {
      const existing = await RoleApiPermission.findOne({
        role_id: distributorRole._id,
        api_permission_id: permission._id,
      });

      if (!existing) {
        await RoleApiPermission.create({
          role_id: distributorRole._id,
          api_permission_id: permission._id,
        });
        console.log(`✓ Assigned: ${permission.api_permissions} → Distributor`);
      } else {
        console.log(`  Already assigned: ${permission.api_permissions} → Distributor`);
      }
    }

    // Summary
    console.log("\n=== Summary ===\n");
    const totalPermissions = await RoleApiPermission.countDocuments({
      role_id: distributorRole._id,
    });
    console.log(`✓ Distributor role has ${totalPermissions} active permissions`);
    console.log("\nPermissions for Distributor role:");
    
    const rolePermissions = await RoleApiPermission.find({
      role_id: distributorRole._id,
    }).populate("api_permission_id");

    rolePermissions.forEach((rp) => {
      console.log(`  - ${rp.api_permission_id.api_permissions}`);
    });

    console.log("\n✓ Distributor permissions setup complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error:", error);
    process.exit(1);
  }
};

main();
