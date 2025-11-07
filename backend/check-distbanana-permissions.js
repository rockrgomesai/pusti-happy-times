const mongoose = require("mongoose");
require("dotenv").config();

const checkPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find distbanana user
    const user = await mongoose.connection.db
      .collection("users")
      .findOne({ username: "distbanana" });
    console.log("👤 User: distbanana");
    console.log("   Role ID:", user?.role_id);
    console.log();

    if (!user?.role_id) {
      console.log("❌ User has no role assigned!");
      await mongoose.disconnect();
      return;
    }

    // Find role
    const role = await mongoose.connection.db.collection("roles").findOne({ _id: user.role_id });
    console.log("🔑 Role:", role?.name);
    console.log("   Description:", role?.description);
    console.log();

    // Find role's API permissions
    const roleApiPerms = await mongoose.connection.db
      .collection("role_api_permissions")
      .find({ role_id: user.role_id })
      .toArray();

    console.log("📋 Role API Permissions assigned:", roleApiPerms.length);

    // Get the actual permissions
    if (roleApiPerms.length > 0) {
      const permissionIds = roleApiPerms.map((rap) => rap.api_permission_id);
      const permissions = await mongoose.connection.db
        .collection("api_permissions")
        .find({ _id: { $in: permissionIds } })
        .toArray();

      console.log("\n🔐 Permissions:");
      permissions.forEach((perm) => {
        console.log(`   - ${perm.api_permissions || "UNDEFINED"}: ${perm.description || "N/A"}`);
      });

      // Check for demandorder permissions specifically
      const demandOrderPerms = permissions.filter(
        (p) => p.api_permissions && p.api_permissions.startsWith("demandorder:")
      );
      console.log("\n🛒 Demand Order Permissions:", demandOrderPerms.length);
      if (demandOrderPerms.length === 0) {
        console.log("   ❌ NO DEMAND ORDER PERMISSIONS FOUND!");
        console.log("   Required permissions:");
        console.log("      - demandorder:read");
        console.log("      - demandorder:create");
        console.log("      - demandorder:update");
        console.log("      - demandorder:delete");
      } else {
        demandOrderPerms.forEach((perm) => {
          console.log(`   ✅ ${perm.api_permissions}`);
        });
      }
    } else {
      console.log("   ❌ Role has NO API permissions assigned!");
    }

    // Check if demandorder permissions exist in the database
    console.log("\n📊 Checking if demandorder permissions exist in database:");
    const allDemandOrderPerms = await mongoose.connection.db
      .collection("api_permissions")
      .find({ api_permissions: { $regex: /^demandorder:/ } })
      .toArray();

    console.log(`   Found ${allDemandOrderPerms.length} demandorder permissions in database:`);
    allDemandOrderPerms.forEach((perm) => {
      console.log(`   - ${perm.api_permissions} (${perm._id})`);
    });

    await mongoose.disconnect();
    console.log("\n✅ Done");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

checkPermissions();
