const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
const models = require("./src/models");

async function checkInventoryDepot() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    // Find role by ID from the list-roles output
    const role = await models.Role.findById("690750354bdacd1e192d1ab3").lean();

    if (!role) {
      console.log("❌ Role not found");
      process.exit(1);
    }

    console.log("=== ROLE INFO ===");
    console.log("Name:", role.role_name);
    console.log("ID:", role._id);

    // Get all API permissions
    const permissions = await models.RoleApiPermission.find({ role_id: role._id })
      .populate("api_permission_id", "api_permissions")
      .lean();

    console.log(`\n=== API PERMISSIONS (${permissions.length}) ===`);

    const permList = permissions
      .map((p) => p.api_permission_id?.api_permissions)
      .filter(Boolean)
      .sort();

    permList.forEach((p) => console.log(`  ✓ ${p}`));

    // Check for scheduling permissions specifically
    const schedulingPerms = permList.filter((p) => p.toLowerCase().includes("schedul"));
    console.log(`\n=== SCHEDULING PERMISSIONS (${schedulingPerms.length}) ===`);
    if (schedulingPerms.length === 0) {
      console.log("  ❌ NO SCHEDULING PERMISSIONS");
    } else {
      schedulingPerms.forEach((p) => console.log(`  ✓ ${p}`));
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkInventoryDepot();
