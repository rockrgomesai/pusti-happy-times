/**
 * DSR Role and Permissions Setup Script
 * Creates DSR role and permissions for managing Distributor Sales Representatives
 *
 * Run this script: node create-dsr-role-permissions.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { Role, ApiPermission, RoleApiPermission } = require("./src/models");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL || "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

/**
 * DSR Role Configuration
 */
const DSR_ROLE = {
  role: "DSR",
  description: "Distributor Sales Representative - Field staff who distribute goods from distributor inventory to outlets",
  active: true,
};

/**
 * DSR API Permissions
 * Permissions for DSR management and DSR user operations
 */
const DSR_PERMISSIONS = [
  // DSR Management Permissions (for Distributors and Admins)
  {
    api_permissions: "dsr:read",
  },
  {
    api_permissions: "dsr:create",
  },
  {
    api_permissions: "dsr:update",
  },
  {
    api_permissions: "dsr:delete",
  },
  {
    api_permissions: "dsr:create_user",
  },
  
  // DSR User Operational Permissions (for DSR role users)
  {
    api_permissions: "dsr:view_distributor_stock",
  },
  {
    api_permissions: "dsr:create_sale",
  },
  {
    api_permissions: "dsr:manage_damaged_goods",
  },
  {
    api_permissions: "dsr:view_assigned_areas",
  },
  {
    api_permissions: "dsr:view_reports",
  },
];

/**
 * Role-Permission Assignments
 */
const ROLE_PERMISSIONS = {
  // SuperAdmin: Full access to all DSR management
  SuperAdmin: [
    "dsr:read",
    "dsr:create",
    "dsr:update",
    "dsr:delete",
    "dsr:create_user",
  ],

  // Sales Admin: Full access to all DSR management (note: role name has space)
  "Sales Admin": [
    "dsr:read",
    "dsr:create",
    "dsr:update",
    "dsr:delete",
    "dsr:create_user",
  ],

  // Distributor: Manage their own DSRs
  Distributor: [
    "dsr:read",
    "dsr:create",
    "dsr:update",
    "dsr:delete",
    "dsr:create_user",
  ],

  // DSR: Operational permissions for field work
  DSR: [
    "dsr:view_distributor_stock",
    "dsr:create_sale",
    "dsr:manage_damaged_goods",
    "dsr:view_assigned_areas",
    "dsr:view_reports",
  ],

  // ASM: View DSR data in their territory
  ASM: ["dsr:read"],

  // RSM: View DSR data in their region
  RSM: ["dsr:read"],

  // HOS: View all DSR data
  HOS: ["dsr:read"],
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

/**
 * Create DSR Role
 */
async function createDSRRole() {
  try {
    const existingRole = await Role.findOne({ role: DSR_ROLE.role });

    if (existingRole) {
      console.log(`⚠️  DSR role already exists: ${existingRole.role}`);
      return existingRole;
    }

    const role = new Role(DSR_ROLE);
    await role.save();
    console.log(`✅ Created DSR role: ${role.role}`);
    return role;
  } catch (error) {
    console.error("❌ Error creating DSR role:", error.message);
    throw error;
  }
}

/**
 * Create API Permissions
 */
async function createPermissions() {
  const createdPermissions = [];
  const existingPermissions = [];

  for (const permData of DSR_PERMISSIONS) {
    try {
      const existing = await ApiPermission.findOne({
        api_permissions: permData.api_permissions,
      });

      if (existing) {
        existingPermissions.push(existing);
        console.log(`⚠️  Permission already exists: ${permData.api_permissions}`);
        continue;
      }

      const permission = new ApiPermission(permData);
      await permission.save();
      createdPermissions.push(permission);
      console.log(`✅ Created permission: ${permission.api_permissions}`);
    } catch (error) {
      console.error(`❌ Error creating permission ${permData.api_permissions}:`, error.message);
    }
  }

  return {
    created: createdPermissions,
    existing: existingPermissions,
    all: [...createdPermissions, ...existingPermissions],
  };
}

/**
 * Assign Permissions to Roles
 */
async function assignPermissionsToRoles(permissions) {
  const assignments = [];

  for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    try {
      const role = await Role.findOne({ role: roleName });

      if (!role) {
        console.log(`⚠️  Role not found: ${roleName}`);
        continue;
      }

      for (const permCode of permissionCodes) {
        const permission = permissions.all.find((p) => p.api_permissions === permCode);

        if (!permission) {
          console.log(`⚠️  Permission not found: ${permCode}`);
          continue;
        }

        const existing = await RoleApiPermission.findOne({
          role_id: role._id,
          api_permission_id: permission._id,
        });

        if (existing) {
          console.log(`⚠️  Assignment exists: ${roleName} -> ${permCode}`);
          continue;
        }

        const assignment = new RoleApiPermission({
          role_id: role._id,
          api_permission_id: permission._id,
        });

        await assignment.save();
        assignments.push(assignment);
        console.log(`✅ Assigned: ${roleName} -> ${permCode}`);
      }
    } catch (error) {
      console.error(`❌ Error assigning permissions to ${roleName}:`, error.message);
    }
  }

  return assignments;
}

/**
 * Main Setup Function
 */
async function setup() {
  console.log("\n🚀 Starting DSR Role and Permissions Setup...\n");

  try {
    await connectDB();

    // Create DSR Role
    console.log("\n📝 Creating DSR Role...");
    const dsrRole = await createDSRRole();

    // Create Permissions
    console.log("\n🔐 Creating DSR Permissions...");
    const permissions = await createPermissions();
    console.log(`\nPermissions Summary:`);
    console.log(`  - Created: ${permissions.created.length}`);
    console.log(`  - Already Existed: ${permissions.existing.length}`);
    console.log(`  - Total: ${permissions.all.length}`);

    // Assign Permissions to Roles
    console.log("\n🔗 Assigning Permissions to Roles...");
    const assignments = await assignPermissionsToRoles(permissions);
    console.log(`\n✅ Created ${assignments.length} new role-permission assignments`);

    console.log("\n✨ DSR Role and Permissions Setup Complete!\n");

    console.log("📋 Summary:");
    console.log(`  - DSR Role: ${dsrRole ? "Created/Exists" : "Failed"}`);
    console.log(`  - Permissions Created: ${permissions.created.length}`);
    console.log(`  - Permissions Existing: ${permissions.existing.length}`);
    console.log(`  - New Assignments: ${assignments.length}`);

    console.log("\n📝 Next Steps:");
    console.log("  1. Restart the backend server to load new permissions");
    console.log("  2. Existing users must logout and login again to refresh tokens");
    console.log("  3. Use the DSR routes at /api/v1/dsrs");
    console.log("  4. Create DSR records via POST /api/v1/dsrs");
    console.log("  5. Optionally create frontend pages for DSR management\n");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB\n");
  }
}

// Run setup
setup();
