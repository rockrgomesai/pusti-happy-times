require("dotenv").config();
const mongoose = require("mongoose");

async function checkPermission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");
    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );

    const role = await Role.findOne({ role: "Inventory Depot" }).lean();

    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    console.log("Role:", role.role);
    console.log("Role ID:", role._id);

    // Get permissions
    const permissionIds = role.api_permission_ids || [];
    console.log(`\nTotal permissions: ${permissionIds.length}`);

    const permissions = await ApiPermission.find({
      _id: { $in: permissionIds },
    }).lean();

    console.log("\nAPI Permissions:");
    permissions.forEach((p) => console.log(`  - ${p.name}`));

    const hasLoadSheet = permissions.some((p) => p.name === "load-sheet:create");
    console.log(`\n${hasLoadSheet ? "✓" : "❌"} Has load-sheet:create: ${hasLoadSheet}`);

    if (!hasLoadSheet) {
      console.log("\n⚠️  Need to add load-sheet:create permission to Inventory Depot role");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkPermission();
