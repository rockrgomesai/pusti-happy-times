const mongoose = require("mongoose");
const models = require("./src/models");

async function checkPermissions() {
  try {
    await mongoose.connect("mongodb://localhost:27017/pusti_happy_times");
    console.log("Connected to MongoDB");

    const role = await models.Role.findOne({ role_name: "Inventory Manager" }).lean();
    if (!role) {
      console.log("Inventory Manager role not found");
      process.exit(0);
    }

    console.log("\n=== INVENTORY MANAGER ROLE ===");
    console.log("Role ID:", role._id);
    console.log("Role Name:", role.role_name);

    const permissions = await models.RoleApiPermission.find({ role_id: role._id })
      .populate("api_permission_id", "api_permissions")
      .lean();

    console.log("\nTotal API Permissions:", permissions.length);
    console.log("\n=== CURRENT PERMISSIONS ===");

    const permList = permissions
      .map((p) => p.api_permission_id?.api_permissions)
      .filter(Boolean)
      .sort();

    permList.forEach((p) => console.log("  ✓", p));

    // Check for scheduling permissions
    const schedulingPerms = permList.filter((p) => p.includes("schedul"));
    console.log("\n=== SCHEDULING PERMISSIONS ===");
    if (schedulingPerms.length === 0) {
      console.log("  ❌ NO SCHEDULING PERMISSIONS FOUND");
    } else {
      schedulingPerms.forEach((p) => console.log("  ✓", p));
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkPermissions();
