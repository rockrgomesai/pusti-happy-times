require("dotenv").config();
const mongoose = require("mongoose");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addPermission() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Find territories:read permission
    let permission = await db.collection("api_permissions").findOne({
      api_permissions: "territories:read",
    });

    if (!permission) {
      console.log("Creating territories:read permission...");
      const result = await db.collection("api_permissions").insertOne({
        api_permissions: "territories:read",
      });
      permission = { _id: result.insertedId, api_permissions: "territories:read" };
      console.log("✅ Created permission:", permission.api_permissions);
    } else {
      console.log("✅ Permission already exists:", permission.api_permissions);
    }

    // Find field sales roles (ZSM, RSM, ASM, SO)
    const fieldRoles = await db
      .collection("roles")
      .find({
        role: { $in: ["ZSM", "RSM", "ASM", "SO"] },
      })
      .toArray();

    console.log(`\nFound ${fieldRoles.length} field sales roles\n`);

    // Add permission to each role
    for (const role of fieldRoles) {
      const hasPermission = await db.collection("roles_api_permissions").findOne({
        role_id: role._id,
        api_permission_id: permission._id,
      });

      if (!hasPermission) {
        await db.collection("roles_api_permissions").insertOne({
          role_id: role._id,
          api_permission_id: permission._id,
          created_at: new Date(),
        });
        console.log(`  ✅ Added territories:read to ${role.role}`);
      } else {
        console.log(`  ℹ️  ${role.role} already has territories:read`);
      }
    }

    console.log("\n✅ Done!");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addPermission();
