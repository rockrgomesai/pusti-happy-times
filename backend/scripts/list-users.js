const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI);

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");

    const users = await User.find({}).select("username user_type").limit(20);

    console.log("\n📋 Users found in database:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    users.forEach((user) => {
      console.log(`  ${user.username} - Type: ${user.user_type}`);
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

listUsers();
