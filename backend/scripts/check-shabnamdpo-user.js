/**
 * Check shabnamdpo user details and permissions
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // 1. Find shabnamdpo user
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ username: "shabnamdpo" });

    if (!user) {
      console.log("❌ User shabnamdpo not found");
      process.exit(1);
    }

    console.log("\n👤 User: shabnamdpo");
    console.log(`   ID: ${user._id}`);
    console.log(`   Active: ${user.active}`);
    console.log(`   Role ID: ${user.role_id}`);
    console.log(`   Employee ID: ${user.employee_id}`);

    // 2. Get role details
    const rolesCollection = db.collection("roles");
    const role = await rolesCollection.findOne({ _id: user.role_id });

    if (!role) {
      console.log("❌ Role not found");
      process.exit(1);
    }

    console.log(`\n🎭 Role: ${role.role}`);
    console.log(`   ID: ${role._id}`);
    console.log(`   Active: ${role.active}`);

    // 3. Get employee details
    if (user.employee_id) {
      const employeesCollection = db.collection("employees");
      const employee = await employeesCollection.findOne({ _id: user.employee_id });

      if (employee) {
        console.log(`\n👔 Employee Details:`);
        console.log(`   Name: ${employee.name}`);
        console.log(`   Employee Type: ${employee.employee_type}`);
        console.log(`   Facility ID: ${employee.facility_id}`);
        console.log(`   Factory Store ID: ${employee.factory_store_id || "N/A"}`);
      }
    }

    // 4. Get all API permissions for this role
    const roleApiPermissionsCollection = db.collection("roles_api_permissions");
    const rolePermissions = await roleApiPermissionsCollection
      .find({ role_id: role._id })
      .toArray();

    console.log(`\n📋 API Permissions (${rolePermissions.length}):`);

    const apiPermissionsCollection = db.collection("api_permissions");
    const permissionDetails = [];

    for (const rp of rolePermissions) {
      const perm = await apiPermissionsCollection.findOne({ _id: rp.api_permission_id });
      if (perm) {
        permissionDetails.push(perm.api_permissions);
      }
    }

    permissionDetails.sort();
    permissionDetails.forEach((p) => {
      const isInventory = p.includes("inventory:");
      console.log(`   ${isInventory ? "📦" : "  "} ${p}`);
    });

    // 5. Check for required inventory permissions
    const requiredPerms = [
      "inventory:pending-receipts:read",
      "inventory:receive:create",
      "inventory:view:read",
    ];

    console.log(`\n🎯 Required Inventory Permissions:`);
    requiredPerms.forEach((required) => {
      const hasIt = permissionDetails.includes(required);
      console.log(`   ${hasIt ? "✅" : "❌"} ${required}`);
    });

    console.log("\n✅ Check complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();
