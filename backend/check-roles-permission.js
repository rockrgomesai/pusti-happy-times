/**
 * Check and Fix roles:read Permission for Super Admin
 */

const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const Role = require("./src/models/Role");

// Get RoleApiPermission from JunctionTables
const junctionTables = require("./src/models/JunctionTables");
const RoleApiPermission = junctionTables.RoleApiPermission;

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkAndFixRolesPermission() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // 1. Check if roles:read permission exists
    console.log("📝 Checking roles:read permission...");
    let rolesReadPerm = await ApiPermission.findOne({ api_permissions: "roles:read" });

    if (!rolesReadPerm) {
      console.log("❌ roles:read permission NOT FOUND");
      console.log("   Creating roles:read permission...");
      rolesReadPerm = await ApiPermission.create({ api_permissions: "roles:read" });
      console.log(`   ✅ Created: roles:read (${rolesReadPerm._id})`);
    } else {
      console.log(`   ✅ Found: roles:read (${rolesReadPerm._id})`);
    }

    // 2. Check SuperAdmin role
    console.log("\n📋 Checking SuperAdmin role...");
    const superAdmin = await Role.findOne({ role: "SuperAdmin" });

    if (!superAdmin) {
      console.log("❌ SuperAdmin role NOT FOUND!");
      console.log("   This is a critical error. Please check your database.");
      process.exit(1);
    }

    console.log(`   ✅ Found: SuperAdmin (${superAdmin._id})`);

    // 3. Check if permission is assigned to Super Admin
    console.log("\n🔗 Checking permission assignment...");
    const assignment = await RoleApiPermission.findOne({
      role_id: superAdmin._id,
      api_permission_id: rolesReadPerm._id,
    });

    if (!assignment) {
      console.log("   ❌ NOT ASSIGNED");
      console.log("   Assigning roles:read to Super Admin...");

      await RoleApiPermission.create({
        role_id: superAdmin._id,
        api_permission_id: rolesReadPerm._id,
      });

      console.log("   ✅ ASSIGNED successfully");
    } else {
      console.log("   ✅ ALREADY ASSIGNED");
    }

    // 4. Verify all role-related permissions for Super Admin
    console.log("\n📊 Checking all role-related permissions...");
    const rolePermissions = ["roles:read", "roles:create", "roles:update", "roles:delete"];

    for (const permName of rolePermissions) {
      let perm = await ApiPermission.findOne({ api_permissions: permName });

      if (!perm) {
        console.log(`   ⚠️  ${permName} does not exist, creating...`);
        perm = await ApiPermission.create({ api_permissions: permName });
      }

      const exists = await RoleApiPermission.findOne({
        role_id: superAdmin._id,
        api_permission_id: perm._id,
      });

      if (!exists) {
        console.log(`   ➕ Assigning ${permName} to SuperAdmin...`);
        await RoleApiPermission.create({
          role_id: superAdmin._id,
          api_permission_id: perm._id,
        });
        console.log(`   ✅ ${permName} assigned`);
      } else {
        console.log(`   ✅ ${permName} already assigned`);
      }
    }

    console.log("\n✨ All checks complete!");
    console.log("\n⚠️  IMPORTANT: Users must logout and login again to refresh their JWT tokens.");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  } finally {
    console.log("\n🔌 Closing database connection...");
    await mongoose.connection.close();
    console.log("✅ Done");
  }
}

checkAndFixRolesPermission();
