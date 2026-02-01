/**
 * Create API Permissions for Secondary Offers Module
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

const secondaryOffersPermissions = [
  {
    category: "Secondary Offers",
    method: "POST",
    endpoint: "/product/secondaryoffers/outlets/resolve",
    description: "Resolve targeted outlets for secondary offers",
    api_permissions: "secondary-offers:read",
  },
  {
    category: "Secondary Offers",
    method: "POST",
    endpoint: "/product/secondaryoffers/routes/eligible",
    description: "Get eligible routes for secondary offers",
    api_permissions: "secondary-offers:read",
  },
  {
    category: "Secondary Offers",
    method: "GET",
    endpoint: "/product/secondaryoffers/outlet-types",
    description: "Get outlet types for filtering",
    api_permissions: "secondary-offers:read",
  },
  {
    category: "Secondary Offers",
    method: "GET",
    endpoint: "/product/secondaryoffers/outlet-channels",
    description: "Get outlet channels for filtering",
    api_permissions: "secondary-offers:read",
  },
  {
    category: "Secondary Offers",
    method: "POST",
    endpoint: "/product/secondaryoffers",
    description: "Create secondary offer",
    api_permissions: "secondary-offers:create",
  },
  {
    category: "Secondary Offers",
    method: "GET",
    endpoint: "/product/secondaryoffers",
    description: "List all secondary offers",
    api_permissions: "secondary-offers:read",
  },
  {
    category: "Secondary Offers",
    method: "GET",
    endpoint: "/product/secondaryoffers/:id",
    description: "Get secondary offer by ID",
    api_permissions: "secondary-offers:read",
  },
  {
    category: "Secondary Offers",
    method: "PUT",
    endpoint: "/product/secondaryoffers/:id",
    description: "Update secondary offer",
    api_permissions: "secondary-offers:update",
  },
  {
    category: "Secondary Offers",
    method: "DELETE",
    endpoint: "/product/secondaryoffers/:id",
    description: "Delete secondary offer",
    api_permissions: "secondary-offers:delete",
  },
  {
    category: "Secondary Offers",
    method: "PATCH",
    endpoint: "/product/secondaryoffers/:id/status",
    description: "Toggle secondary offer status",
    api_permissions: "secondary-offers:update",
  },
];

// Role permission mappings
const rolePermissionMap = {
  SuperAdmin: [
    "secondary-offers:create",
    "secondary-offers:read",
    "secondary-offers:update",
    "secondary-offers:delete",
  ],
  "Sales Admin": [
    "secondary-offers:create",
    "secondary-offers:read",
    "secondary-offers:update",
    "secondary-offers:delete",
  ],
  MIS: [
    "secondary-offers:create",
    "secondary-offers:read",
    "secondary-offers:update",
    "secondary-offers:delete",
  ],
  ZSM: ["secondary-offers:read"],
  RSM: ["secondary-offers:read"],
  ASM: ["secondary-offers:read"],
  SO: ["secondary-offers:read"],
  Distributor: ["secondary-offers:read"],
  DSR: ["secondary-offers:read"],
};

async function createSecondaryOffersPermissions() {
  let client;
  try {
    client = await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    const db = mongoose.connection.db;

    // Step 1: Insert API permissions
    console.log("Creating secondary offers API permissions...");
    const apiPermissionsCollection = db.collection("api_permissions");

    let createdCount = 0;
    for (const permission of secondaryOffersPermissions) {
      const existing = await apiPermissionsCollection.findOne({
        api_permissions: permission.api_permissions,
      });

      if (!existing) {
        await apiPermissionsCollection.insertOne(permission);
        console.log(`✓ Created permission: ${permission.api_permissions}`);
        createdCount++;
      } else {
        console.log(`⏭  Skipped (exists): ${permission.api_permissions}`);
      }
    }
    console.log(`\n✓ Created ${createdCount} new API permissions`);

    // Step 2: Assign permissions to roles
    console.log("\nAssigning permissions to roles...");

    const rolesCollection = db.collection("roles");
    const roleApiPermissionsCollection = db.collection("role_api_permissions");

    for (const [roleName, permissionCodes] of Object.entries(rolePermissionMap)) {
      const role = await rolesCollection.findOne({ role: roleName });
      if (!role) {
        console.log(`⚠ Role '${roleName}' not found, skipping...`);
        continue;
      }

      // Find permission IDs
      const permissions = await apiPermissionsCollection
        .find({
          api_permissions: { $in: permissionCodes },
        })
        .toArray();

      if (permissions.length === 0) {
        console.log(`⚠ No permissions found for role '${roleName}', skipping...`);
        continue;
      }

      let assignedCount = 0;
      for (const perm of permissions) {
        const existing = await roleApiPermissionsCollection.findOne({
          role_id: role._id,
          api_permission_id: perm._id,
        });

        if (!existing) {
          await roleApiPermissionsCollection.insertOne({
            role_id: role._id,
            api_permission_id: perm._id,
          });
          assignedCount++;
        }
      }

      console.log(
        `✓ Assigned ${assignedCount} new permissions to role '${roleName}' (${permissions.length} total)`
      );
    }

    console.log("\n✅ Secondary Offers permissions setup complete!");
    console.log("\nPermission Summary:");
    console.log("Full Access (CRUD): SuperAdmin, Sales Admin, MIS");
    console.log("View Only: ZSM, RSM, ASM, SO, Distributor, DSR");
  } catch (error) {
    console.error("Error creating permissions:", error);
  } finally {
    if (client) {
      await mongoose.connection.close();
      console.log("\nMongoDB connection closed");
    }
  }
}

// Run the script
createSecondaryOffersPermissions();
