const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

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

async function addTransportReadPermission() {
  try {
    // Check if permission already exists
    let permission = await ApiPermission.findOne({ api_permissions: "transports:read" });

    if (!permission) {
      // Create the permission
      permission = await ApiPermission.create({
        api_permissions: "transports:read",
      });
      console.log("✅ Created transports:read permission");
    } else {
      console.log("ℹ️  transports:read permission already exists");
    }

    // Assign to Inventory Depot role using RoleApiPermission junction table
    const inventoryDepotRoleId = "690750354bdacd1e192d1ab3";

    // Check if already assigned
    const existing = await RoleApiPermission.findOne({
      role_id: new mongoose.Types.ObjectId(inventoryDepotRoleId),
      api_permission_id: permission._id,
    });

    if (!existing) {
      await RoleApiPermission.create({
        role_id: new mongoose.Types.ObjectId(inventoryDepotRoleId),
        api_permission_id: permission._id,
      });
      console.log("✅ Assigned transports:read to Inventory Depot role via RoleApiPermission");
    } else {
      console.log("ℹ️  Permission already assigned to Inventory Depot role in RoleApiPermission");
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

addTransportReadPermission();
