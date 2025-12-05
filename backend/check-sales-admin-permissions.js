/**
 * Check Sales Admin API permissions for DO endpoints
 *
 * Usage: node check-sales-admin-permissions.js
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

    console.log("\n=== Sales Admin API Permissions Check ===\n");

    // Find Sales Admin role
    const salesAdminRole = await Role.findOne({ role: "Sales Admin" });
    if (!salesAdminRole) {
      console.error("✗ Sales Admin role not found");
      process.exit(1);
    }

    console.log(`Role: ${salesAdminRole.role}`);
    console.log(`Role ID: ${salesAdminRole._id}\n`);

    // Get all API permissions for Sales Admin
    const roleApiPermissions = await RoleApiPermission.find({
      role_id: salesAdminRole._id,
    }).populate("api_permission_id");

    console.log(`Total API permissions: ${roleApiPermissions.length}\n`);

    // Check for DO-related permissions
    console.log("=== DO-Related API Permissions ===\n");

    const doPermissions = roleApiPermissions.filter((rp) => {
      const perm = rp.api_permission_id;
      return (
        perm &&
        (perm.resource?.includes("demandorder") ||
          perm.resource?.includes("do-list") ||
          perm.resource?.includes("my-do-list") ||
          perm.permission?.includes("demandorder"))
      );
    });

    if (doPermissions.length > 0) {
      console.log(`Found ${doPermissions.length} DO-related permissions:\n`);
      doPermissions.forEach((rp, index) => {
        const perm = rp.api_permission_id;
        console.log(`${index + 1}. ${perm.permission}`);
        console.log(`   Resource: ${perm.resource || "N/A"}`);
        console.log(`   Description: ${perm.description || "N/A"}`);
        console.log("");
      });
    } else {
      console.log("✗ No DO-related API permissions found!\n");
    }

    // Check specific permissions needed
    console.log("=== Checking Required Permissions ===\n");

    const requiredPermissions = [
      "read:demandorder",
      "do-list:read",
      "my-do-list:read",
      "demandorders:read",
    ];

    for (const permName of requiredPermissions) {
      const perm = await ApiPermission.findOne({ permission: permName });
      if (perm) {
        const hasPermission = await RoleApiPermission.findOne({
          role_id: salesAdminRole._id,
          api_permission_id: perm._id,
        });

        if (hasPermission) {
          console.log(`✓ ${permName} - ASSIGNED`);
        } else {
          console.log(`✗ ${permName} - MISSING`);
        }
      } else {
        console.log(`⚠ ${permName} - Permission doesn't exist in database`);
      }
    }

    console.log("\n=== All Sales Admin Permissions ===\n");
    const allPerms = roleApiPermissions
      .filter((rp) => rp.api_permission_id)
      .map((rp) => rp.api_permission_id.permission)
      .sort();

    allPerms.forEach((perm, index) => {
      console.log(`${index + 1}. ${perm}`);
    });

    console.log("");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
};

main();
