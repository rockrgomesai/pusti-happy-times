const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");
const Role = require("./src/models/Role");

async function checkTerritoriesPermissions() {
  try {
    await mongoose.connect(
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin"
    );
    console.log("Connected to MongoDB\n");

    // Get territories:read permission
    const readPerm = await ApiPermission.findOne({ api_permissions: "territories:read" });

    if (!readPerm) {
      console.log("❌ territories:read permission not found!");
      return;
    }

    console.log(`✓ Found territories:read permission: ${readPerm._id}\n`);

    // Check which roles have this permission
    const rolePerms = await RoleApiPermission.find({ api_permission_id: readPerm._id }).populate(
      "role_id",
      "role"
    );

    console.log("Roles with territories:read permission:");
    console.log("==========================================");
    for (const rp of rolePerms) {
      console.log(`  - ${rp.role_id.role}`);
    }

    // Check specific roles
    const rolesToCheck = ["Product Manager", "Distributor", "Superadmin"];
    console.log("\nDetailed check:");
    console.log("==========================================");

    for (const roleName of rolesToCheck) {
      const role = await Role.findOne({ role: roleName });
      if (role) {
        const hasPermission = await RoleApiPermission.findOne({
          role_id: role._id,
          api_permission_id: readPerm._id,
        });
        console.log(`${roleName}: ${hasPermission ? "✓ HAS" : "✗ MISSING"} territories:read`);
      } else {
        console.log(`${roleName}: Role not found`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDisconnected from MongoDB");
  }
}

checkTerritoriesPermissions();
