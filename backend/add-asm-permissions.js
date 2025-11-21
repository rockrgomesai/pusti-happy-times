/**
 * Add demandorder:read permission to ASM role
 * ASMs need this permission to view orders pending their approval
 */

const mongoose = require("mongoose");
const { Role, ApiPermission, RoleApiPermission } = require("./src/models");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addASMPermissions() {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find ASM role
    const asmRole = await Role.findOne({ role: "ASM" });
    if (!asmRole) {
      console.log("❌ ASM role not found!");
      process.exit(1);
    }
    console.log(`✅ Found ASM role (${asmRole._id})`);

    // List of permissions to assign to ASM
    const permissionsToAssign = ["demandorder:read", "demandorder:submit", "demandorder:update"];

    for (const permName of permissionsToAssign) {
      // Find or create permission
      let permission = await ApiPermission.findOne({
        api_permissions: permName,
      });

      if (!permission) {
        // Insert directly into DB to bypass schema validation issues
        const db = mongoose.connection.db;
        const result = await db.collection("api_permissions").insertOne({
          api_permissions: permName,
        });
        permission = await ApiPermission.findById(result.insertedId);
        console.log(`✅ Created permission: ${permName} (${permission._id})`);
      } else {
        console.log(`ℹ️  Permission exists: ${permName} (${permission._id})`);
      }

      // Assign permission to ASM role
      const existing = await RoleApiPermission.findOne({
        role_id: asmRole._id,
        api_permission_id: permission._id,
      });

      if (existing) {
        console.log(`   Already assigned to ASM role`);
      } else {
        await RoleApiPermission.create({
          role_id: asmRole._id,
          api_permission_id: permission._id,
        });
        console.log(`   ✅ Assigned to ASM role`);
      }
    }

    console.log("\n🎉 All permissions configured for ASM role!\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addASMPermissions();
