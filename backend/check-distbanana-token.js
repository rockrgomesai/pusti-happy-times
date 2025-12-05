require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const Role = require("./src/models/Role");
const Distributor = require("./src/models/Distributor");

async function checkToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const user = await User.findOne({ username: "distbanana" })
      .populate("role_id")
      .populate("distributor_id");

    if (!user) {
      console.log("❌ User not found!");
      process.exit(1);
    }

    console.log("📋 User Details:");
    console.log("  Username:", user.username);
    console.log("  User Type:", user.user_type);
    console.log("  User ID:", user._id);
    console.log("  Role:", user.role_id?.role);
    console.log("  Distributor ID (from DB):", user.distributor_id?._id || "NOT SET");
    console.log("  Distributor Name:", user.distributor_id?.name || "NOT SET");
    console.log("");

    if (!user.distributor_id) {
      console.log("❌ ERROR: User does not have distributor_id in database!");
      console.log("   This user cannot access distributor endpoints.");
    } else {
      console.log("✅ User has distributor_id in database");
      console.log("   The fallback logic should work.");
      console.log("");
      console.log("💡 Token Payload During Login Will Include:");
      console.log("   - user_type:", user.user_type);
      console.log("   - distributor_id:", user.distributor_id._id);
      console.log("   - distributor_name:", user.distributor_id.name);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkToken();
