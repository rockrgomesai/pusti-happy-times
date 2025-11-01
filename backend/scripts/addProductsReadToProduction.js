/**
 * Add products:read permission to Production role
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addPermission() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find Production role
    const role = await db.collection("roles").findOne({ role: "Production" });
    if (!role) {
      console.log("❌ Production role not found");
      process.exit(1);
    }

    console.log("✅ Found Production role:", role._id);

    // Find or create products:read permission
    let permission = await db.collection("api_permissions").findOne({
      api_permissions: "products:read",
    });

    if (!permission) {
      const result = await db.collection("api_permissions").insertOne({
        api_permissions: "products:read",
      });
      permission = { _id: result.insertedId };
      console.log("✅ Created products:read permission");
    } else {
      console.log("✅ Found existing products:read permission");
    }

    // Check if already assigned
    const existing = await db.collection("role_api_permissions").findOne({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    if (existing) {
      console.log("✅ Permission already assigned to Production role");
    } else {
      await db.collection("role_api_permissions").insertOne({
        role_id: role._id,
        api_permission_id: permission._id,
      });
      console.log("✅ Assigned products:read permission to Production role");
    }

    console.log("\n✅ ===== COMPLETE =====");
    console.log("Production role can now read products");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

addPermission();
