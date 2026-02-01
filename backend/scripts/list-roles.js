/**
 * List all roles in the database
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function listRoles() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }));

    const roles = await Role.find({}).sort({ role: 1 });

    console.log(`Found ${roles.length} roles:\n`);
    roles.forEach((role) => {
      console.log(
        `  - ${role.role || role.name || "UNNAMED"} (ID: ${role._id}, active: ${role.active})`
      );
    });
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

listRoles();
