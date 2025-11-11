/**
 * Add Collections Module Permissions
 * Run: node add-collections-permissions.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function addCollectionsPermissions() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({
        permission: String,
        description: String,
        method: String,
        endpoint: String,
      })
    );

    const RoleApiPermission = mongoose.model(
      "RoleApiPermission",
      new mongoose.Schema({
        role_id: mongoose.Schema.Types.ObjectId,
        api_permission_id: mongoose.Schema.Types.ObjectId,
      })
    );

    const Role = mongoose.model(
      "Role",
      new mongoose.Schema({
        role: String,
      })
    );

    // Define collections permissions
    const collectionsPermissions = [
      {
        permission: "collection:read",
        description: "View collections",
        method: "GET",
        endpoint: "/ordermanagement/demandorders/collections",
      },
      {
        permission: "collection:create",
        description: "Create new collection",
        method: "POST",
        endpoint: "/ordermanagement/demandorders/collections",
      },
      {
        permission: "collection:delete",
        description: "Delete collection",
        method: "DELETE",
        endpoint: "/ordermanagement/demandorders/collections/:id",
      },
      {
        permission: "bdbank:read",
        description: "View Bangladesh banks",
        method: "GET",
        endpoint: "/master/bd-banks",
      },
    ];

    console.log("📝 Creating/Updating Collections Permissions...\n");

    const createdPermissions = [];

    for (const perm of collectionsPermissions) {
      const existing = await ApiPermission.findOne({ permission: perm.permission });

      if (existing) {
        console.log(`   ⚠️  Permission already exists: ${perm.permission}`);
        createdPermissions.push(existing);
      } else {
        const newPermission = await ApiPermission.create(perm);
        console.log(`   ✅ Created: ${perm.permission}`);
        createdPermissions.push(newPermission);
      }
    }

    console.log("\n📋 Assigning Permissions to Distributor Role...\n");

    // Find Distributor role
    const distributorRole = await Role.findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.error("❌ Distributor role not found!");
      process.exit(1);
    }

    console.log(`   Found role: ${distributorRole.role} (${distributorRole._id})`);

    let assignedCount = 0;

    for (const permission of createdPermissions) {
      const existing = await RoleApiPermission.findOne({
        role_id: distributorRole._id,
        api_permission_id: permission._id,
      });

      if (existing) {
        console.log(`   ⚠️  Already assigned: ${permission.permission}`);
      } else {
        await RoleApiPermission.create({
          role_id: distributorRole._id,
          api_permission_id: permission._id,
        });
        console.log(`   ✅ Assigned: ${permission.permission}`);
        assignedCount++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Total permissions: ${createdPermissions.length}`);
    console.log(`   Newly assigned: ${assignedCount}`);
    console.log(`   Already assigned: ${createdPermissions.length - assignedCount}`);

    console.log("\n✨ Collections permissions setup complete!");
    console.log("\n⚠️  Note: Users need to logout and login again to refresh their JWT tokens.");
  } catch (error) {
    console.error("❌ Error setting up permissions:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the script
addCollectionsPermissions();
