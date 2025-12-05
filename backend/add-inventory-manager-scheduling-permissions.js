/**
 * Add scheduling API permissions to Inventory Manager role
 *
 * Usage: node add-inventory-manager-scheduling-permissions.js
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

// Scheduling permissions needed for Inventory Manager
const schedulingPermissions = [
  "scheduling:read", // View schedulings, my-schedulings, depots
  "scheduling:create", // Create new schedulings
  "scheduling:update", // Update schedulings
];

async function addPermissions() {
  try {
    await connectDB();

    console.log("\n=== Adding Scheduling Permissions to Inventory Depot ===\n");

    // Get Inventory Depot role
    const role = await Role.findOne({ role_name: "Inventory Depot" });
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }
    console.log(`✓ Found role: ${role.role_name} (${role._id})`);

    // Get current permissions
    const currentPermissions = await RoleApiPermission.find({ role_id: role._id })
      .populate("api_permission_id", "api_permissions")
      .lean();

    const existingPermNames = currentPermissions
      .map((p) => p.api_permission_id?.api_permissions)
      .filter(Boolean);

    console.log(`\n✓ Current permissions count: ${existingPermNames.length}`);

    // Add each permission
    let addedCount = 0;
    let skippedCount = 0;

    for (const permName of schedulingPermissions) {
      if (existingPermNames.includes(permName)) {
        console.log(`⊘ ${permName} - already assigned`);
        skippedCount++;
        continue;
      }

      // Find or create permission
      let permission = await ApiPermission.findOne({ api_permissions: permName });

      if (!permission) {
        console.log(`  Creating new permission: ${permName}`);
        permission = await ApiPermission.create({
          api_permissions: permName,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Link to role
      const exists = await RoleApiPermission.findOne({
        role_id: role._id,
        api_permission_id: permission._id,
      });

      if (!exists) {
        await RoleApiPermission.create({
          role_id: role._id,
          api_permission_id: permission._id,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`✓ ${permName} - added`);
        addedCount++;
      } else {
        console.log(`⊘ ${permName} - already linked`);
        skippedCount++;
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Added: ${addedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Total: ${schedulingPermissions.length}`);

    // Verify final count
    const finalPermissions = await RoleApiPermission.find({ role_id: role._id })
      .populate("api_permission_id", "api_permissions")
      .lean();

    const finalPermNames = finalPermissions
      .map((p) => p.api_permission_id?.api_permissions)
      .filter(Boolean)
      .sort();

    console.log(`\n✓ Inventory Depot now has ${finalPermNames.length} API permissions`);

    // Show scheduling permissions
    const schedulingPerms = finalPermNames.filter((p) => p.includes("schedul"));
    console.log(`\n=== Scheduling Permissions (${schedulingPerms.length}) ===`);
    schedulingPerms.forEach((p) => console.log(`  ✓ ${p}`));

    await mongoose.connection.close();
    console.log("\n✓ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

addPermissions();
