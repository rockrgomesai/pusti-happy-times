/**
 * Test Login Credentials
 * Verify that the password works for inventorymanagerruby
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function testLogin() {
  try {
    console.log("🔌 Connecting to MongoDB...");

    const mongoURI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB\n");

    const username = "inventorymanagerruby";
    const testPassword = "Password@123";

    console.log(`🔍 Testing login for: ${username}`);
    console.log(`🔑 Testing password: ${testPassword}\n`);

    const user = await User.findOne({ username }).populate("role_id");

    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("👤 User found:", user._id);
    console.log("  Username:", user.username);
    console.log("  Active:", user.active);
    console.log("  Role:", user.role_id?.role);
    console.log("");

    // Check if password exists
    if (!user.password) {
      console.log("❌ User has no password hash!");
      console.log("   Run: node scripts/setInventoryUserPassword.js");
      process.exit(1);
    }

    console.log("🔐 Password hash exists");
    console.log("  Hash (first 20 chars):", user.password.substring(0, 20) + "...");
    console.log("");

    // Test password comparison
    console.log("🧪 Testing password comparison...");

    try {
      const isMatch = await bcrypt.compare(testPassword, user.password);

      if (isMatch) {
        console.log("✅ PASSWORD MATCHES!");
        console.log("");
        console.log("📋 Login should work with:");
        console.log("   Username:", username);
        console.log("   Password:", testPassword);
        console.log("");
        console.log("💡 If login still fails, check:");
        console.log("   1. Backend server is running");
        console.log("   2. Frontend is sending correct credentials");
        console.log("   3. Check backend logs for more details");
      } else {
        console.log("❌ PASSWORD DOES NOT MATCH!");
        console.log("");
        console.log("💡 Trying common passwords...");

        const commonPasswords = [
          "password",
          "Password123",
          "admin123",
          "ruby123",
          "Password@123",
          "password123",
        ];

        let found = false;
        for (const pwd of commonPasswords) {
          const match = await bcrypt.compare(pwd, user.password);
          if (match) {
            console.log(`✅ Correct password is: "${pwd}"`);
            found = true;
            break;
          }
        }

        if (!found) {
          console.log("❌ None of the common passwords match");
          console.log("   You may need to reset the password");
          console.log("   Run: node scripts/setInventoryUserPassword.js");
        }
      }
    } catch (err) {
      console.log("❌ Error comparing password:", err.message);
      console.log("   The password hash may be corrupted");
      console.log("   Run: node scripts/setInventoryUserPassword.js");
    }

    console.log("");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testLogin();
