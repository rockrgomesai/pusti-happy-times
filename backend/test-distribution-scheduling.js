/**
 * Test Distribution user scheduling access
 *
 * Usage: node test-distribution-scheduling.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Models
const models = require("./src/models");
const User = models.User;
const Role = models.Role;
const RoleApiPermission = models.RoleApiPermission;
const ApiPermission = models.ApiPermission;

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ MongoDB connected");
  } catch (error) {
    console.error("✗ MongoDB connection error:", error);
    process.exit(1);
  }
};

const main = async () => {
  try {
    await connectDB();

    console.log("\n=== Testing Distribution User Scheduling Access ===\n");

    // Find a Distribution user
    const distributionRole = await Role.findOne({ role: "Distribution" });
    if (!distributionRole) {
      console.error("✗ Distribution role not found");
      process.exit(1);
    }

    const distributionUser = await User.findOne({ role_id: distributionRole._id })
      .populate("role_id")
      .lean();

    if (!distributionUser) {
      console.error("✗ No user with Distribution role found");
      console.log("\nLooking for users with any role...");
      const allUsers = await User.find({})
        .populate("role_id")
        .select("username email role_id")
        .limit(10)
        .lean();

      console.log("\nSample users:");
      allUsers.forEach((u) => {
        console.log(`  - ${u.username}: ${u.role_id?.role || "No role"}`);
      });
      process.exit(1);
    }

    console.log(`✓ Found Distribution user: ${distributionUser.username}`);
    console.log(`  Role: ${distributionUser.role_id.role}`);
    console.log(`  User ID: ${distributionUser._id}\n`);

    // Check if this role has scheduling:read permission
    const schedulingReadPerm = await ApiPermission.findOne({
      api_permissions: "scheduling:read",
    });

    if (!schedulingReadPerm) {
      console.error("✗ scheduling:read permission doesn't exist in database!");
      process.exit(1);
    }

    console.log(`✓ scheduling:read permission exists: ${schedulingReadPerm._id}\n`);

    const hasPermission = await RoleApiPermission.findOne({
      role_id: distributionRole._id,
      api_permission_id: schedulingReadPerm._id,
    });

    if (hasPermission) {
      console.log("✓ Distribution role HAS scheduling:read permission");
    } else {
      console.log("✗ Distribution role MISSING scheduling:read permission");
    }

    // Check all scheduling-related permissions for Distribution
    console.log("\n=== All Scheduling Permissions for Distribution ===\n");

    const allPerms = await RoleApiPermission.find({
      role_id: distributionRole._id,
    })
      .populate("api_permission_id")
      .lean();

    const schedulingPerms = allPerms
      .filter((rp) => rp.api_permission_id?.api_permissions?.includes("schedul"))
      .map((rp) => rp.api_permission_id.api_permissions);

    if (schedulingPerms.length > 0) {
      schedulingPerms.forEach((p) => console.log(`  ✓ ${p}`));
    } else {
      console.log("  No scheduling permissions found");
    }

    console.log("\n✓ Test complete\n");

    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
