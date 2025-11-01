/**
 * Script to add Notification Permissions for all roles
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

const permissions = [
  {
    api_permissions: "notifications:read",
    description: "View own notifications",
    active: true,
  },
  {
    api_permissions: "notifications:update",
    description: "Mark notifications as read",
    active: true,
  },
];

async function run() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const apiPermissionsCollection = db.collection("api_permissions");
    const roleApiPermissionsCollection = db.collection("role_api_permissions");
    const rolesCollection = db.collection("roles");

    // Get all roles
    const allRoles = await rolesCollection.find({}).toArray();
    console.log(`📋 Found ${allRoles.length} roles\n`);

    for (const perm of permissions) {
      // Check if permission already exists
      let permission = await apiPermissionsCollection.findOne({
        api_permissions: perm.api_permissions,
      });

      if (!permission) {
        // Create new permission
        const result = await apiPermissionsCollection.insertOne({
          ...perm,
          created_at: new Date(),
          updated_at: new Date(),
        });
        permission = { _id: result.insertedId, ...perm };
        console.log(`✅ Created permission: ${perm.api_permissions} (${permission._id})`);
      } else {
        console.log(`ℹ️  Permission already exists: ${perm.api_permissions} (${permission._id})`);
      }

      // Assign to all roles
      for (const role of allRoles) {
        const existingAssignment = await roleApiPermissionsCollection.findOne({
          role_id: role._id,
          api_permission_id: permission._id,
        });

        if (!existingAssignment) {
          await roleApiPermissionsCollection.insertOne({
            role_id: role._id,
            api_permission_id: permission._id,
            created_at: new Date(),
            updated_at: new Date(),
          });
          console.log(`   ✅ Assigned to ${role.role} role`);
        } else {
          console.log(`   ℹ️  Already assigned to ${role.role} role`);
        }
      }

      console.log("");
    }

    console.log("✅ All notification permissions processed successfully!\n");

    // Summary
    console.log("📊 Summary:");
    console.log(`   Permissions created/verified: ${permissions.length}`);
    console.log(`   Assigned to ${allRoles.length} roles\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

run();
