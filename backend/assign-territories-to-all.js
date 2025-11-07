const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

async function assignTerritoriesPermissions() {
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

    // Roles that need territories access for offer creation and viewing
    const rolesToAssign = ["SuperAdmin", "Sales Admin", "Order Management", "Distributor"];

    // Query roles collection directly
    const rolesCollection = mongoose.connection.collection("roles");

    for (const roleName of rolesToAssign) {
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
          console.log(`✓ Assigned territories:read to ${roleName}`);
        } else {
          console.log(`- ${roleName} already has territories:read`);
        }
      } else {
        console.log(`⚠ Role not found: ${roleName}`);
      }
    }

    console.log("\n✓ All permissions assigned!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDisconnected from MongoDB");
  }
}

assignTerritoriesPermissions();
