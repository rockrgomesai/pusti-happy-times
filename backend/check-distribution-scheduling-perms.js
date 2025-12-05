/**
 * Check Distribution role scheduling permissions
 *
 * Usage: node check-distribution-scheduling-perms.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Models
const models = require("./src/models");
const Role = models.Role;
const ApiPermission = models.ApiPermission;
const RoleApiPermission = models.RoleApiPermission;

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

    console.log("\n=== Checking Distribution Role Scheduling Permissions ===\n");

    // Find Distribution role
    const distributionRole = await Role.findOne({ role: "Distribution" });
    if (!distributionRole) {
      console.error("✗ Distribution role not found");
      process.exit(1);
    }

    console.log(`✓ Found Distribution role: ${distributionRole._id}\n`);

    // Get all API permissions for Distribution
    const roleApiPermissions = await RoleApiPermission.find({
      role_id: distributionRole._id,
    })
      .populate("api_permission_id")
      .lean();

    const permissions = roleApiPermissions.map((rp) => rp.api_permission_id).filter(Boolean);

    console.log(`Total API permissions: ${permissions.length}\n`);

    // Check for scheduling-related permissions
    const schedulingPerms = permissions.filter((p) => p.api_permissions?.includes("schedul"));

    console.log("=== Scheduling-Related Permissions ===\n");
    if (schedulingPerms.length > 0) {
      schedulingPerms.forEach((p) => {
        console.log(`  ✓ ${p.api_permissions}`);
      });
    } else {
      console.log("  ✗ No scheduling permissions found!");
    }

    // Check for specific required permissions
    console.log("\n=== Required Permissions Check ===\n");

    const requiredPerms = [
      "scheduling:read",
      "scheduling:create",
      "scheduling:update",
      "my-schedulings:read",
    ];

    for (const permName of requiredPerms) {
      const perm = await ApiPermission.findOne({ api_permissions: permName });
      if (perm) {
        const hasIt = await RoleApiPermission.findOne({
          role_id: distributionRole._id,
          api_permission_id: perm._id,
        });
        if (hasIt) {
          console.log(`  ✓ ${permName}`);
        } else {
          console.log(`  ✗ ${permName} - MISSING`);
        }
      } else {
        console.log(`  ⚠ ${permName} - Permission doesn't exist`);
      }
    }

    // Check what scheduling permissions exist in the system
    console.log("\n=== All Scheduling Permissions in System ===\n");
    const allSchedulingPerms = await ApiPermission.find({
      api_permissions: { $regex: "schedul", $options: "i" },
    });

    if (allSchedulingPerms.length > 0) {
      allSchedulingPerms.forEach((p) => {
        console.log(`  - ${p.api_permissions}`);
      });
    } else {
      console.log("  No scheduling permissions exist in the system!");
    }

    console.log("");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
