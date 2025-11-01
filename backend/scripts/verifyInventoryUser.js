/**
 * Verify Inventory User Permissions
 * Check if user has all required permissions and proper employee setup
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const Employee = require("../src/models/Employee");
const Facility = require("../src/models/Facility");
const { ApiPermission } = require("../src/models/Permission");
const { RoleApiPermission } = require("../src/models/JunctionTables");

async function verifyInventoryUser() {
  try {
    console.log("🔌 Connecting to MongoDB...");

    const mongoURI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB\n");

    const username = "inventorymanagerruby";
    console.log(`🔍 Verifying user: ${username}\n`);

    // Get user with full details
    const user = await User.findOne({ username }).populate("role_id").populate("employee_id");

    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("👤 USER DETAILS:");
    console.log("  ✓ Username:", user.username);
    console.log("  ✓ Active:", user.active);
    console.log("  ✓ Role:", user.role_id?.role);
    console.log("");

    // Check employee setup
    if (!user.employee_id) {
      console.log("❌ EMPLOYEE: No employee record");
      process.exit(1);
    }

    const employee = await Employee.findById(user.employee_id._id)
      .populate("facility_id", "name type")
      .populate("factory_store_id", "name type");

    console.log("👔 EMPLOYEE DETAILS:");
    console.log("  ✓ Employee Code:", employee.employee_code || "N/A");
    console.log("  ✓ Employee Type:", employee.employee_type);
    console.log("  ✓ Active:", employee.active);

    if (employee.facility_id) {
      console.log("  ✓ Facility:", employee.facility_id.name, `(${employee.facility_id.type})`);
    } else {
      console.log("  ⚠️ Facility: null");
    }

    if (employee.factory_store_id) {
      console.log(
        "  ✓ Factory Store (Depot):",
        employee.factory_store_id.name,
        `(${employee.factory_store_id.type})`
      );
    } else {
      console.log("  ❌ Factory Store: null - THIS IS THE PROBLEM!");
    }
    console.log("");

    // Check if middleware requirements are met
    console.log("🔐 MIDDLEWARE REQUIREMENTS CHECK:");

    const checks = {
      "Has Inventory role": user.role_id?.role === "Inventory",
      "Has employee record": !!user.employee_id,
      "Employee type is 'facility'": employee.employee_type === "facility",
      "Has factory_store_id": !!employee.factory_store_id,
      "Factory store is Depot type": employee.factory_store_id?.type === "Depot",
    };

    let allPassed = true;
    for (const [check, passed] of Object.entries(checks)) {
      console.log(`  ${passed ? "✓" : "❌"} ${check}`);
      if (!passed) allPassed = false;
    }
    console.log("");

    if (!allPassed) {
      console.log("❌ MIDDLEWARE VALIDATION WILL FAIL\n");
      console.log("💡 Solution: User needs factory_store_id assigned to a Depot-type facility");
      console.log("   Run: node scripts/fixInventoryUser.js\n");
    } else {
      console.log("✅ MIDDLEWARE VALIDATION WILL PASS\n");
    }

    // Check permissions
    console.log("🔑 PERMISSION CHECK:");

    const inventoryPermissions = [
      "inventory:pending-receipts:read",
      "inventory:receive:create",
      "inventory:view:read",
      "inventory:transactions:read",
    ];

    for (const permCode of inventoryPermissions) {
      const apiPerm = await ApiPermission.findOne({ api_permissions: permCode });

      if (!apiPerm) {
        console.log(`  ❌ ${permCode} - Permission not found in database`);
        continue;
      }

      const roleAssignment = await RoleApiPermission.findOne({
        role_id: user.role_id._id,
        api_permission_id: apiPerm._id,
      });

      if (roleAssignment) {
        console.log(`  ✓ ${permCode}`);
      } else {
        console.log(`  ❌ ${permCode} - Not assigned to Inventory role`);
      }
    }
    console.log("");

    // Final verdict
    if (allPassed) {
      console.log("✅ USER IS PROPERLY CONFIGURED");
      console.log("");
      console.log("💡 If you're still getting 403 errors:");
      console.log("   1. Restart the backend server");
      console.log("   2. Log out from frontend");
      console.log("   3. Log back in to get fresh JWT token");
      console.log("   4. The new token will have updated factory_store_id\n");
    } else {
      console.log("❌ USER CONFIGURATION INCOMPLETE");
      console.log("   Fix the issues above before testing\n");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verifyInventoryUser();
