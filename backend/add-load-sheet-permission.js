require("dotenv").config();
const mongoose = require("mongoose");

async function addLoadSheetPermission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");
    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );

    // Find the role
    const role = await Role.findOne({ role: "Inventory Depot" });
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    // Find or create the permission
    let permission = await ApiPermission.findOne({ api_permissions: "load-sheet:create" });

    if (!permission) {
      console.log("Creating load-sheet:create permission...");
      permission = await ApiPermission.create({
        api_permissions: "load-sheet:create",
      });
      console.log("✓ Permission created");
    } else {
      console.log("✓ Permission already exists");
    }

    // Add to role if not already there
    if (!role.api_permission_ids) {
      role.api_permission_ids = [];
    }

    const hasPermission = role.api_permission_ids.some(
      (id) => id.toString() === permission._id.toString()
    );

    if (!hasPermission) {
      role.api_permission_ids.push(permission._id);
      await role.save();
      console.log("✓ Added load-sheet:create permission to Inventory Depot role");
    } else {
      console.log("✓ Permission already assigned to role");
    }

    console.log("\n✅ Done!");
    console.log("Please log out and log back in for changes to take effect.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addLoadSheetPermission();
