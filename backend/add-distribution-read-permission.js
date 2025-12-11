/**
 * Add demandorder:read permission to Distribution role
 * Distribution users need to read demand orders to view order details in scheduled list
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

async function addReadPermission() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 Using URI:", MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")); // Hide password
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");

    // Find or create demandorder:read permission
    let readPermission = await ApiPermission.findOne({ code: "demandorder:read" });

    if (!readPermission) {
      console.log("\n📝 Creating demandorder:read permission...");
      readPermission = await ApiPermission.create({
        code: "demandorder:read",
        description: "View demand order details",
        module: "Order Management",
        active: true,
      });
      console.log("✅ Permission created");
    } else {
      console.log("\n✓ Permission demandorder:read already exists");
    }

    // Find Distribution role
    const distributionRole = await Role.findOne({ role: "Distribution" });

    if (!distributionRole) {
      console.error("❌ Distribution role not found!");
      process.exit(1);
    }

    console.log(`\n📌 Found Distribution role: ${distributionRole._id}`);

    // Check if permission already assigned
    const hasPermission = distributionRole.api_permissions.some(
      (p) => p.toString() === readPermission._id.toString()
    );

    if (hasPermission) {
      console.log("✅ Permission already assigned to Distribution role");
    } else {
      console.log("\n➕ Adding permission to Distribution role...");
      distributionRole.api_permissions.push(readPermission._id);
      await distributionRole.save();
      console.log("✅ Permission added successfully");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Distribution role now has demandorder:read permission");
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addReadPermission();
