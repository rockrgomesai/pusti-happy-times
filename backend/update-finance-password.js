/**
 * Update Finance User Password
 * Sets password to: Tanim999
 *
 * Usage: node update-finance-password.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

const updatePassword = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 Using URI:", MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")); // Hide password
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");

    // Find Finance user
    const financeUser = await User.findOne({ username: "Finance" });

    if (!financeUser) {
      console.error("❌ Finance user not found!");
      process.exit(1);
    }

    console.log(`📌 Found Finance user: ${financeUser._id}`);
    console.log(`📧 Email: ${financeUser.email}`);

    // Generate new password hash for "Tanim999"
    const newPassword = "Tanim999";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log(`🔐 New password hash: ${hashedPassword}`);

    // Update the user
    financeUser.password = hashedPassword;
    financeUser.updated_at = new Date();
    await financeUser.save();

    console.log("✅ Password updated successfully!");
    console.log(`\n📋 Login Credentials:`);
    console.log(`   Username: Finance`);
    console.log(`   Password: ${newPassword}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating password:", error);
    process.exit(1);
  }
};

updatePassword();
