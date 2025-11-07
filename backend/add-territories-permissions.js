const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");
const Role = require("./src/models/Role");

async function addTerritoriesPermissions() {
  try {
    await mongoose.connect(
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin"
    );
    console.log("Connected to MongoDB");

    // Check if territories permissions exist
    const existingPerms = await ApiPermission.find({ api_permissions: /^territories:/ });
    console.log(`Found ${existingPerms.length} existing territories permissions`);

    // Define territories permissions
    const territoriesPermissions = [
      "territories:read",
      "territories:create",
      "territories:update",
      "territories:delete",
    ];

    // Create permissions if they don't exist
    const createdPermissions = [];
    for (const permName of territoriesPermissions) {
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

    // Get all permissions for territories
    const allTerritoriesPerms = await ApiPermission.find({ api_permissions: /^territories:/ });

    // Find roles that should have territories access
    // Product Manager needs to read territories for offer creation
    const productManagerRole = await Role.findOne({ role: "Product Manager" });

    if (productManagerRole) {
      console.log("\nAssigning territories:read to Product Manager...");

      const readPerm = allTerritoriesPerms.find((p) => p.api_permissions === "territories:read");

      if (readPerm) {
        const existing = await RoleApiPermission.findOne({
          role_id: productManagerRole._id,
          api_permission_id: readPerm._id,
        });

        if (!existing) {
          await RoleApiPermission.create({
            role_id: productManagerRole._id,
            api_permission_id: readPerm._id,
          });
          console.log("✓ Assigned territories:read to Product Manager");
        } else {
          console.log("- Product Manager already has territories:read");
        }
      }
    }

    // Also check for other roles that might need territories access
    const adminRole = await Role.findOne({ role: "Superadmin" });
    if (adminRole) {
      console.log("\nAssigning all territories permissions to Superadmin...");

      for (const perm of allTerritoriesPerms) {
        const existing = await RoleApiPermission.findOne({
          role_id: adminRole._id,
          api_permission_id: perm._id,
        });

        if (!existing) {
          await RoleApiPermission.create({
            role_id: adminRole._id,
            api_permission_id: perm._id,
          });
          console.log(`✓ Assigned ${perm.api_permissions} to Superadmin`);
        }
      }
    }

    // Also assign to Distributor role (they might need to see territories in their context)
    const distributorRole = await Role.findOne({ role: "Distributor" });
    if (distributorRole) {
      console.log("\nAssigning territories:read to Distributor...");

      const readPerm = allTerritoriesPerms.find((p) => p.api_permissions === "territories:read");

      if (readPerm) {
        const existing = await RoleApiPermission.findOne({
          role_id: distributorRole._id,
          api_permission_id: readPerm._id,
        });

        if (!existing) {
          await RoleApiPermission.create({
            role_id: distributorRole._id,
            api_permission_id: readPerm._id,
          });
          console.log("✓ Assigned territories:read to Distributor");
        } else {
          console.log("- Distributor already has territories:read");
        }
      }
    }

    console.log("\n✓ Territories permissions setup complete!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  }
}

addTerritoriesPermissions();
