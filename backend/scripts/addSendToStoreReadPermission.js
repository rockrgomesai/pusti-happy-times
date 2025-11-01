const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addReadPermission() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // 1. Find or create the API permission
    const apiPermissionsCollection = db.collection("api_permissions");
    let readPermission = await apiPermissionsCollection.findOne({
      api_permissions: "production:send-to-store:read",
    });

    if (!readPermission) {
      const result = await apiPermissionsCollection.insertOne({
        api_permissions: "production:send-to-store:read",
        description: "Read/view production send to store shipments",
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      readPermission = { _id: result.insertedId };
      console.log("✅ Created production:send-to-store:read permission");
    } else {
      console.log("ℹ️  Permission already exists");
    }

    // 2. Find Production role
    const rolesCollection = db.collection("roles");
    const productionRole = await rolesCollection.findOne({ role: "Production" });

    if (!productionRole) {
      console.log("❌ Production role not found");
      process.exit(1);
    }

    console.log("📋 Production Role ID:", productionRole._id);

    // 3. Check if permission is already assigned
    const roleApiPermissionsCollection = db.collection("role_api_permissions");
    const existing = await roleApiPermissionsCollection.findOne({
      role_id: productionRole._id,
      api_permission_id: readPermission._id,
    });

    if (existing) {
      console.log("ℹ️  Permission already assigned to Production role");
    } else {
      await roleApiPermissionsCollection.insertOne({
        role_id: productionRole._id,
        api_permission_id: readPermission._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✅ Assigned permission to Production role");
    }

    console.log("\n✅ Done! Production role now has production:send-to-store:read permission");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

addReadPermission();
