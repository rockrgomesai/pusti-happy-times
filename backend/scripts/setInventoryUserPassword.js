/**
 * Set Password for Inventory User
 * Set a password for inventorymanagerruby
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function setPassword() {
  try {
    console.log("🔌 Connecting to MongoDB...");

    const mongoURI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB\n");

    const username = "inventorymanagerruby";
    const newPassword = "password123"; // User's password

    console.log(`🔍 Finding user: ${username}`);

    // Need to explicitly select password field since it has select: false
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("✅ User found:", user._id);
    console.log("📝 Current password exists:", !!user.password);
    console.log("📝 Setting new password...\n");

    // Set plain password - the pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    // Verify it saved
    const verifyUser = await User.findById(user._id).select("+password");
    console.log("✅ Verified password saved:", !!verifyUser.password);

    console.log("✅ Password set successfully!");
    console.log("");
    console.log("📋 LOGIN CREDENTIALS:");
    console.log("   Username:", username);
    console.log("   Password:", newPassword);
    console.log("");
    console.log("🔐 You can now log in with these credentials");
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

setPassword();
