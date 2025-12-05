const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
const models = require("./src/models");

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await models.User.findOne({ username: "inventorymanagerpapaya" })
      .populate("role_id", "role_name")
      .lean();

    if (user) {
      console.log("\nUser found:");
      console.log("  Username:", user.username);
      console.log("  Email:", user.email);
      console.log("  Role:", user.role_id ? user.role_id.role_name : "NO ROLE");
      console.log("  Role ID:", user.role_id);
    } else {
      console.log("User not found");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkUser();
