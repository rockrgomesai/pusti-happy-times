/**
 * Test Database Connection and User Data
 * This script tests database connectivity and checks user data
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Define User schema (simplified)
const userSchema = new mongoose.Schema(
  {
    username: String,
    password: String,
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    email: String,
    active: Boolean,
  },
  { collection: "users" }
);

const User = mongoose.model("User", userSchema);

// Define Role schema (simplified)
const roleSchema = new mongoose.Schema(
  {
    role: String,
  },
  { collection: "roles" }
);

const Role = mongoose.model("Role", roleSchema);

const testDatabase = async () => {
  await connectDB();

  console.log("\n📊 Database Test Results:");
  console.log("=".repeat(50));

  // Test 1: Count users
  const userCount = await User.countDocuments();
  console.log(`👥 Total users: ${userCount}`);

  // Test 2: List all users
  const users = await User.find({}).populate("role_id");
  console.log("\n📝 User details:");
  users.forEach((user, index) => {
    console.log(`${index + 1}. Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Active: ${user.active}`);
    console.log(`   Role: ${user.role_id?.role || "No role"}`);
    console.log(`   Password hash: ${user.password || "No password"}`);
    console.log(
      `   Password length: ${user.password ? user.password.length : 0}`
    );
    console.log("");
  });

  // Test 3: Test password verification for superadmin
  const superadmin = await User.findOne({ username: "superadmin" });
  if (superadmin) {
    console.log("🔐 Password testing for superadmin:");

    const testPasswords = ["password", "admin123", "superadmin", "123456"];
    for (const testPassword of testPasswords) {
      try {
        const isValid = await bcrypt.compare(testPassword, superadmin.password);
        console.log(
          `   "${testPassword}": ${isValid ? "✅ VALID" : "❌ Invalid"}`
        );
      } catch (error) {
        console.log(`   "${testPassword}": ❌ Error - ${error.message}`);
      }
    }
  }

  // Test 4: Count roles
  const roleCount = await Role.countDocuments();
  console.log(`\n🎭 Total roles: ${roleCount}`);

  const roles = await Role.find({});
  console.log("📝 Role details:");
  roles.forEach((role, index) => {
    console.log(`${index + 1}. Role: ${role.role} (ID: ${role._id})`);
  });

  mongoose.connection.close();
  console.log("\n✅ Database test completed");
};

testDatabase().catch(console.error);
