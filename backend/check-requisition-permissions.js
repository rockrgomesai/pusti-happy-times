require("dotenv").config();
const mongoose = require("mongoose");

async function checkPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // Get user
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");
    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );
    const RoleApiPermission = mongoose.model(
      "RoleApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "roles_api_permissions"
    );

    const user = await User.findOne({ username: "inventorymanagerpapaya" });
    if (!user) {
      console.log("❌ User not found!");
      return;
    }

    const role = await Role.findById(user.role_id);
    console.log("👤 User: inventorymanagerpapaya");
    console.log("🎭 Role:", role.role, `(${role._id})\n`);

    // Check for requisition permissions
    const requisitionPerms = await ApiPermission.find({
      api_permissions: { $regex: /requisition/i },
    });

    console.log("📋 Requisition-related API Permissions in database:");
    if (requisitionPerms.length === 0) {
      console.log("   ❌ NONE FOUND - setup script may not have run!");
    } else {
      requisitionPerms.forEach((p) => {
        console.log(`   - ${p.api_permissions} (${p._id})`);
      });
    }

    // Check role assignments
    console.log("\n🔐 Permissions assigned to 'Inventory Depot' role:");
    const rolePerms = await RoleApiPermission.find({ role_id: role._id });

    if (rolePerms.length === 0) {
      console.log("   ❌ NO PERMISSIONS ASSIGNED!");
    } else {
      for (const rp of rolePerms) {
        const perm = await ApiPermission.findById(rp.api_permission_id);
        console.log(`   - ${perm.api_permissions}`);
      }
    }

    // Check if requisition permissions are assigned
    console.log("\n✅ Checking specific requisition permissions:");
    const readPerm = await ApiPermission.findOne({
      api_permissions: "inventory:requisitions:read",
    });
    const writePerm = await ApiPermission.findOne({
      api_permissions: "inventory:requisitions:write",
    });

    if (!readPerm) {
      console.log("   ❌ inventory:requisitions:read - NOT FOUND");
    } else {
      const assigned = await RoleApiPermission.findOne({
        role_id: role._id,
        api_permission_id: readPerm._id,
      });
      console.log(
        `   ${assigned ? "✅" : "❌"} inventory:requisitions:read - ${assigned ? "ASSIGNED" : "NOT ASSIGNED"}`
      );
    }

    if (!writePerm) {
      console.log("   ❌ inventory:requisitions:write - NOT FOUND");
    } else {
      const assigned = await RoleApiPermission.findOne({
        role_id: role._id,
        api_permission_id: writePerm._id,
      });
      console.log(
        `   ${assigned ? "✅" : "❌"} inventory:requisitions:write - ${assigned ? "ASSIGNED" : "NOT ASSIGNED"}`
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkPermissions();
