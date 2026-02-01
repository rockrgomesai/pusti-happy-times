/**
 * Check User Permissions
 * Usage: node check-user-permissions.js <username>
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

const username = process.argv[2];

if (!username) {
  console.log("Usage: node check-user-permissions.js <username>");
  process.exit(1);
}

async function checkUserPermissions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully\n");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }));
    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false })
    );

    // Find user
    const user = await User.findOne({ username: username });
    if (!user) {
      console.log(`User "${username}" not found`);
      process.exit(1);
    }

    console.log(`User: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Active: ${user.active}\n`);

    // Get user's role
    const role = await Role.findById(user.role_id);
    if (!role) {
      console.log("No role assigned to this user");
      process.exit(1);
    }

    console.log(`Role: ${role.role}`);
    console.log(`Role Active: ${role.active}\n`);

    // Get role's permissions
    const permissions = await ApiPermission.find({
      _id: { $in: role.api_permissions || [] },
    });

    console.log(`Total Permissions: ${permissions.length}\n`);

    // Check for outlets permissions
    const outletsPerms = permissions.filter(
      (p) => p.api_permissions && p.api_permissions.startsWith("outlets:")
    );

    console.log(`Outlets Permissions: ${outletsPerms.length}`);
    if (outletsPerms.length > 0) {
      outletsPerms.forEach((p) => {
        console.log(`  ✓ ${p.api_permissions}`);
      });
    } else {
      console.log("  ❌ No outlets permissions found for this role!");
      console.log("\n  Solution: Run the assign-outlets-permissions.js script");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkUserPermissions();
