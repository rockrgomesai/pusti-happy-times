/**
 * Script to add Inventory API Permissions and assign to Inventory role
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ MongoDB URI not found in environment variables");
  process.exit(1);
}

const permissions = [
  {
    api_permissions: "inventory:pending-receipts:read",
    description: "View pending shipments from production (not yet received)",
    active: true,
  },
  {
    api_permissions: "inventory:receive:create",
    description: "Receive goods from production shipments",
    active: true,
  },
  {
    api_permissions: "inventory:view:read",
    description: "View current inventory levels at factory store",
    active: true,
  },
  {
    api_permissions: "inventory:transactions:read",
    description: "View inventory transaction history",
    active: true,
  },
];

async function run() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Find or create Inventory role
    const rolesCollection = db.collection("roles");
    let inventoryRole = await rolesCollection.findOne({ role: "Inventory" });

    if (!inventoryRole) {
      console.log("📝 Creating Inventory role...");
      const result = await rolesCollection.insertOne({
        role: "Inventory",
        description: "Inventory management role for factory store operations",
        created_at: new Date(),
        updated_at: new Date(),
      });
      inventoryRole = { _id: result.insertedId, role: "Inventory" };
      console.log("✅ Inventory role created:", inventoryRole._id);
    } else {
      console.log("✅ Inventory role found:", inventoryRole._id);
    }

    console.log("\n📋 Processing permissions...\n");

    const apiPermissionsCollection = db.collection("api_permissions");
    const roleApiPermissionsCollection = db.collection("role_api_permissions");

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

      // Check if role-permission assignment exists
      const existingAssignment = await roleApiPermissionsCollection.findOne({
        role_id: inventoryRole._id,
        api_permission_id: permission._id,
      });

      if (!existingAssignment) {
        // Assign permission to Inventory role
        await roleApiPermissionsCollection.insertOne({
          role_id: inventoryRole._id,
          api_permission_id: permission._id,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`   ✅ Assigned to Inventory role`);
      } else {
        console.log(`   ℹ️  Already assigned to Inventory role`);
      }

      console.log("");
    }

    console.log("✅ All inventory permissions processed successfully!\n");

    // Summary
    console.log("📊 Summary:");
    console.log(`   Role: ${inventoryRole.role} (${inventoryRole._id})`);
    console.log(`   Permissions created/verified: ${permissions.length}`);

    const totalAssignments = await roleApiPermissionsCollection.countDocuments({
      role_id: inventoryRole._id,
    });
    console.log(`   Total permissions for Inventory role: ${totalAssignments}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

run();
