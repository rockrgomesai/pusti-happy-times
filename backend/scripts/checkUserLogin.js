/**
 * Check User Login Status
 * Verify if inventorymanagerruby can log in
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const Employee = require("../src/models/Employee");

async function checkUserLogin() {
  try {
    console.log("🔌 Connecting to MongoDB...");

    const mongoURI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB\n");

    const username = "inventorymanagerruby";
    const testPassword = "Password@123"; // Common test password

    console.log(`🔍 Checking user: ${username}\n`);

    const user = await User.findOne({ username }).populate("role_id").populate("employee_id");

    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("👤 USER STATUS:");
    console.log("  Username:", user.username);
    console.log("  Active:", user.active ? "✅ YES" : "❌ NO");
    console.log("  Role:", user.role_id?.role);
    console.log("  Employee:", user.employee_id ? "✅ Linked" : "❌ Not linked");
    console.log("  Password Hash:", user.password ? "✅ Set" : "❌ Missing");
    console.log("");

    if (!user.active) {
      console.log("❌ PROBLEM: User account is INACTIVE");
      console.log("   This causes 403 Forbidden on login");
      console.log("");
      console.log("💡 Solution: Activate the user account");
      console.log("   Run the following in MongoDB:");
      console.log(`   db.users.updateOne({username: "${username}"}, {$set: {active: true}})`);
      console.log("");
    }

    // Test password
    console.log("🔑 PASSWORD TEST:");
    console.log(`  Testing with password: ${testPassword}`);

    if (!user.password) {
      console.log("  ❌ User has no password hash!");
      console.log("");
      console.log("💡 Solution: Set a password for the user");
      console.log("   You may need to run a password reset script");
    } else {
      try {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        if (isMatch) {
          console.log("  ✅ Password matches!");
        } else {
          console.log("  ❌ Password does NOT match");
          console.log("     Try these common passwords:");
          const commonPasswords = [
            "password",
            "Password123",
            "Password@123",
            "admin123",
            "ruby123",
          ];

          for (const pwd of commonPasswords) {
            const match = await bcrypt.compare(pwd, user.password);
            if (match) {
              console.log(`     ✅ Correct password: "${pwd}"`);
              break;
            }
          }
        }
      } catch (err) {
        console.log("  ❌ Error comparing password:", err.message);
      }
    }
    console.log("");

    // Check employee
    if (user.employee_id) {
      const employee = await Employee.findById(user.employee_id._id)
        .populate("facility_id", "name type")
        .populate("factory_store_id", "name type");

      console.log("👔 EMPLOYEE STATUS:");
      console.log("  Active:", employee.active ? "✅ YES" : "❌ NO");
      console.log("  Employee Type:", employee.employee_type);

      if (employee.facility_id) {
        console.log("  Facility:", employee.facility_id.name, `(${employee.facility_id.type})`);
      }

      if (employee.factory_store_id) {
        console.log(
          "  Factory Store:",
          employee.factory_store_id.name,
          `(${employee.factory_store_id.type})`
        );
      }
      console.log("");

      if (!employee.active) {
        console.log("❌ PROBLEM: Employee record is INACTIVE");
        console.log("   This may cause issues after login");
        console.log("");
      }
    }

    console.log("📋 SUMMARY:");
    const issues = [];

    if (!user.active) issues.push("User account is inactive");
    if (!user.password) issues.push("User has no password");
    if (user.employee_id && !user.employee_id.active) issues.push("Employee record is inactive");
    if (!user.employee_id) issues.push("No employee record linked");

    if (issues.length > 0) {
      console.log("❌ Issues found:");
      issues.forEach((issue) => console.log(`   - ${issue}`));
    } else {
      console.log("✅ All checks passed - user should be able to login");
    }
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUserLogin();
