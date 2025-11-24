const mongoose = require("mongoose");
const Role = require("./src/models/Role");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("✅ Connected to MongoDB\n");

    // Find Distribution role
    const distributionRole = await Role.findOne({ role: "Distribution" });
    console.log(
      "Distribution Role:",
      distributionRole ? `✅ Found (ID: ${distributionRole._id})` : "❌ NOT FOUND"
    );

    if (!distributionRole) {
      console.log("\n⚠️  Distribution role does not exist!");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Find all API permissions for this role
    const rolePerms = await RoleApiPermission.find({ role_id: distributionRole._id }).populate(
      "api_permission_id"
    );

    console.log(`\nAPI Permissions for Distribution role (${rolePerms.length} total):`);
    rolePerms.forEach((rp) => {
      const perm = rp.api_permission_id;
      console.log(`  - ${perm.api_permissions || "undefined"}`);
    });

    // Check specifically for demandorder:schedule
    const schedulePermCheck = rolePerms.find(
      (rp) => rp.api_permission_id.api_permissions === "demandorder:schedule"
    );
    console.log(
      `\ndemandorder:schedule permission: ${schedulePermCheck ? "✅ EXISTS" : "❌ MISSING"}`
    );

    if (!schedulePermCheck) {
      console.log("\n⚠️  Distribution role is missing the demandorder:schedule permission!");
      console.log("This permission needs to be added to the Distribution role.");
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
