require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

async function testPassword() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI_LOCAL);
    console.log("✅ Connected\n");

    const username = "inventorymanagerruby";
    console.log(`🔍 Finding user: ${username}`);
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      console.error("❌ User not found");
      process.exit(1);
    }

    console.log("✅ User found:", user._id);
    console.log("📝 Has password hash:", !!user.password);
    console.log("📏 Hash length:", user.password?.length || 0);
    console.log();

    if (!user.password) {
      console.error("❌ User has no password hash!");
      process.exit(1);
    }

    // Test multiple passwords
    const testPasswords = ["password123", "Password@123", "Password123", "password", "admin123"];

    console.log("🧪 Testing passwords:\n");
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, user.password);
      const status = match ? "✅ MATCH" : "❌ no match";
      console.log(`   "${pwd}": ${status}`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testPassword();
