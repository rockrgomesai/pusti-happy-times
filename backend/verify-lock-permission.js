const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

async function verifyLockPermission() {
  try {
    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );
    const RoleApiPermission = mongoose.model(
      "RoleApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "role_api_permissions"
    );

    // Check permission exists
    const permission = await ApiPermission.findOne({ api_permissions: "load-sheet:lock" });
    console.log(
      "\n📋 Permission:",
      permission ? `✅ ${permission.api_permissions}` : "❌ Not found"
    );

    if (!permission) {
      console.log("\n⚠️  Creating load-sheet:lock permission...");
      const newPerm = await ApiPermission.create({ api_permissions: "load-sheet:lock" });
      console.log("✅ Created:", newPerm.api_permissions);

      // Assign to Inventory Depot role
      const inventoryDepotRoleId = "690750354bdacd1e192d1ab3";
      await RoleApiPermission.create({
        role_id: new mongoose.Types.ObjectId(inventoryDepotRoleId),
        api_permission_id: newPerm._id,
      });
      console.log("✅ Assigned to Inventory Depot role");
    } else {
      // Check if assigned to role
      const inventoryDepotRoleId = "690750354bdacd1e192d1ab3";
      const rolePermission = await RoleApiPermission.findOne({
        role_id: new mongoose.Types.ObjectId(inventoryDepotRoleId),
        api_permission_id: permission._id,
      });

      console.log("   Assigned to Inventory Depot:", rolePermission ? "✅ Yes" : "❌ No");

      if (!rolePermission) {
        await RoleApiPermission.create({
          role_id: new mongoose.Types.ObjectId(inventoryDepotRoleId),
          api_permission_id: permission._id,
        });
        console.log("✅ Now assigned to Inventory Depot role");
      }
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

verifyLockPermission();
