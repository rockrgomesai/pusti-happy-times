const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

async function verifySetup() {
  try {
    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");
    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );

    // Check permission exists
    const permission = await ApiPermission.findOne({ api_permissions: "transports:read" });
    console.log(
      "\n📋 Permission:",
      permission ? `✅ ${permission.api_permissions}` : "❌ Not found"
    );

    // Check role has permission
    const role = await Role.findById("690750354bdacd1e192d1ab3");
    console.log("\n📋 Role:", role ? `✅ ${role.role}` : "❌ Not found");

    if (role && role.api_permissions) {
      const hasPermission = role.api_permissions.some(
        (p) => p.toString() === permission._id.toString()
      );
      console.log("   Has transports:read permission ID:", hasPermission ? "✅ Yes" : "❌ No");
      console.log("   Total permissions:", role.api_permissions.length);

      // Get permission details
      const permissions = await ApiPermission.find({
        _id: { $in: role.api_permissions },
      });

      console.log("\n📋 Transport and Load-sheet related permissions:");
      permissions.forEach((p) => {
        if (
          p.api_permissions &&
          (p.api_permissions.includes("transport") || p.api_permissions.includes("load-sheet"))
        ) {
          console.log(`   - ${p.api_permissions}`);
        }
      });
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

verifySetup();
