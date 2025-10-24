require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkPassword() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find the user
    const user = await db.collection("users").findOne({ username: "areamanagermango" });

    if (!user) {
      console.log("❌ User not found");
    } else {
      console.log("👤 User:", user.username);
      console.log("📧 Email:", user.email);
      console.log("🔐 Password Hash:", user.password);
      console.log("");

      // Test password
      const testPassword = "password123";
      const isMatch = await bcrypt.compare(testPassword, user.password);

      console.log(`Testing password: "${testPassword}"`);
      console.log(`Result: ${isMatch ? "✅ MATCH" : "❌ NO MATCH"}`);

      if (!isMatch) {
        // Try to hash the password and see what we get
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log("\n📝 New hash for password123:", newHash);
        console.log("");

        // Update the user's password
        console.log("🔄 Updating user password...");
        await db.collection("users").updateOne({ _id: user._id }, { $set: { password: newHash } });
        console.log("✅ Password updated!");
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkPassword();
