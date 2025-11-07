require("dotenv").config();
const mongoose = require("mongoose");

async function addDemandOrderPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Create demand order permissions
    const permissions = [
      {
        api_permissions: "demandorder:create",
      },
      {
        api_permissions: "demandorder:read",
      },
      {
        api_permissions: "demandorder:update",
      },
      {
        api_permissions: "demandorder:delete",
      },
    ];

    console.log("Creating demand order permissions...");
    const insertedPerms = await db.collection("api_permissions").insertMany(permissions);
    console.log("✓ Created", Object.keys(insertedPerms.insertedIds).length, "permissions\n");

    // Get Distributor role ID
    const distributorRole = await db.collection("roles").findOne({ role: "Distributor" });
    if (!distributorRole) {
      console.log("❌ Distributor role not found");
      await mongoose.disconnect();
      return;
    }

    console.log("Assigning permissions to Distributor role...");
    const permIds = Object.values(insertedPerms.insertedIds);

    const rolePermissions = permIds.map((permId) => ({
      role_id: distributorRole._id,
      api_permission_id: permId,
      granted_at: new Date(),
    }));

    await db.collection("role_api_permissions").insertMany(rolePermissions);
    console.log("✓ Assigned", rolePermissions.length, "permissions to Distributor role\n");

    console.log("Summary:");
    permissions.forEach((p) => console.log("- " + p.api_permissions));

    await mongoose.disconnect();
    console.log("\n✓ Done!");
  } catch (error) {
    console.error("Error:", error.message);
    if (error.code === 11000) {
      console.log("\nPermissions may already exist. Check with check-dist-perms.js");
    }
    process.exit(1);
  }
}

addDemandOrderPermissions();
