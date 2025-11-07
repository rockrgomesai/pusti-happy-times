require("dotenv").config();
const mongoose = require("mongoose");
const Role = require("./src/models/Role");
const ApiPermission = require("./src/models/ApiPermission");

async function checkPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // Check if Distributor role exists
    const distributorRole = await Role.findOne({ name: "Distributor" }).populate("api_permissions");

    if (!distributorRole) {
      console.log("❌ Distributor role NOT FOUND\n");

      // List all roles
      const allRoles = await Role.find({}).select("name");
      console.log("Available roles:");
      allRoles.forEach((r) => console.log("-", r.name));
      console.log("");
    } else {
      console.log("✓ Distributor role found");
      console.log("Current API permissions:");
      distributorRole.api_permissions.forEach((p) => console.log("-", p.permission_key));
      console.log("");
    }

    // Check if demandorder:create permission exists
    const createPermission = await ApiPermission.findOne({ permission_key: "demandorder:create" });
    if (!createPermission) {
      console.log("❌ demandorder:create permission NOT FOUND\n");

      // List demandorder permissions
      const demandorderPerms = await ApiPermission.find({ permission_key: /^demandorder:/ });
      console.log("Available demandorder permissions:");
      demandorderPerms.forEach((p) => console.log("-", p.permission_key, ":", p.description));
    } else {
      console.log("✓ demandorder:create permission exists");
      console.log("  Description:", createPermission.description);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkPermissions();
