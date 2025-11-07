const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

async function verifyPermissions() {
  try {
    await mongoose.connect(
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin"
    );
    console.log("Connected to MongoDB\n");

    const rolesCollection = mongoose.connection.collection("roles");
    const rolesToCheck = ["SuperAdmin", "Sales Admin", "Order Management", "Distributor"];

    console.log("=== Offers & Territories Permissions by Role ===\n");

    for (const roleName of rolesToCheck) {
      const role = await rolesCollection.findOne({ role: roleName });

      if (role) {
        console.log(`\n${roleName}:`);
        console.log("─".repeat(50));

        const rolePerms = await RoleApiPermission.find({
          role_id: new mongoose.Types.ObjectId(role._id),
        }).populate("api_permission_id");

        const offerPerms = rolePerms.filter((rp) =>
          rp.api_permission_id.api_permissions.startsWith("offers:")
        );
        const territoryPerms = rolePerms.filter((rp) =>
          rp.api_permission_id.api_permissions.startsWith("territories:")
        );

        if (offerPerms.length > 0) {
          console.log("  Offers:");
          offerPerms.forEach((rp) => {
            console.log(`    ✓ ${rp.api_permission_id.api_permissions}`);
          });
        }

        if (territoryPerms.length > 0) {
          console.log("  Territories:");
          territoryPerms.forEach((rp) => {
            console.log(`    ✓ ${rp.api_permission_id.api_permissions}`);
          });
        }

        if (offerPerms.length === 0 && territoryPerms.length === 0) {
          console.log("  ❌ No offers or territories permissions");
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n\nDisconnected from MongoDB");
  }
}

verifyPermissions();
