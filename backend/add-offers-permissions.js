const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

async function addOffersPermissions() {
  try {
    await mongoose.connect(
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin"
    );
    console.log("Connected to MongoDB\n");

    // Check if offers permissions exist
    const existingPerms = await ApiPermission.find({ api_permissions: /^offers:/ });
    console.log(`Found ${existingPerms.length} existing offers permissions\n`);

    // Define offers permissions
    const offersPermissions = ["offers:read", "offers:create", "offers:update", "offers:delete"];

    // Create permissions if they don't exist
    const createdPermissions = [];
    for (const permName of offersPermissions) {
      const existing = await ApiPermission.findOne({ api_permissions: permName });

      if (!existing) {
        const created = await ApiPermission.create({ api_permissions: permName });
        createdPermissions.push(created);
        console.log(`✓ Created permission: ${permName}`);
      } else {
        createdPermissions.push(existing);
        console.log(`- Permission already exists: ${permName}`);
      }
    }

    // Get all permissions for offers
    const allOffersPerms = await ApiPermission.find({ api_permissions: /^offers:/ });

    // Roles that need offers access
    const rolesCollection = mongoose.connection.collection("roles");

    // Roles with read access (can browse offers)
    const readRoles = ["SuperAdmin", "Sales Admin", "Order Management", "Distributor"];

    // Roles with full access (can create/edit/delete)
    const fullAccessRoles = ["SuperAdmin", "Sales Admin"];

    console.log("\n=== Assigning offers:read permission ===");
    const readPerm = allOffersPerms.find((p) => p.api_permissions === "offers:read");

    if (readPerm) {
      for (const roleName of readRoles) {
        const role = await rolesCollection.findOne({ role: roleName });

        if (role) {
          const existing = await RoleApiPermission.findOne({
            role_id: new mongoose.Types.ObjectId(role._id),
            api_permission_id: readPerm._id,
          });

          if (!existing) {
            await RoleApiPermission.create({
              role_id: new mongoose.Types.ObjectId(role._id),
              api_permission_id: readPerm._id,
            });
            console.log(`✓ Assigned offers:read to ${roleName}`);
          } else {
            console.log(`- ${roleName} already has offers:read`);
          }
        } else {
          console.log(`⚠ Role not found: ${roleName}`);
        }
      }
    }

    console.log("\n=== Assigning full offers permissions ===");
    for (const roleName of fullAccessRoles) {
      const role = await rolesCollection.findOne({ role: roleName });

      if (role) {
        for (const perm of allOffersPerms) {
          const existing = await RoleApiPermission.findOne({
            role_id: new mongoose.Types.ObjectId(role._id),
            api_permission_id: perm._id,
          });

          if (!existing) {
            await RoleApiPermission.create({
              role_id: new mongoose.Types.ObjectId(role._id),
              api_permission_id: perm._id,
            });
            console.log(`✓ Assigned ${perm.api_permissions} to ${roleName}`);
          } else {
            console.log(`- ${roleName} already has ${perm.api_permissions}`);
          }
        }
      }
    }

    console.log("\n✓ Offers permissions setup complete!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDisconnected from MongoDB");
  }
}

addOffersPermissions();
