/**
 * Add inventory:view:read permission to Inventory Depot role
 * Uses the proper junction table structure
 */

const mongoose = require("mongoose");
const Role = require("./src/models/Role");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

const MONGODB_URI =
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addInventoryPermission() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Inventory Depot role
    const role = await Role.findOne({ role: "Inventory Depot" });
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }
    console.log("✅ Found Inventory Depot role:", role._id);

    // Find or create inventory:view:read permission
    let permission = await ApiPermission.findOne({ api_permissions: "inventory:view:read" });
    if (!permission) {
      console.log("❌ inventory:view:read permission not found");
      console.log("Creating permission...");

      permission = new ApiPermission({
        api_permissions: "inventory:view:read",
      });
      await permission.save();
      console.log("✅ Created permission:", permission._id);
    } else {
      console.log("✅ Found permission:", permission._id);
    }

    // Check if role already has this permission via junction table
    const existing = await RoleApiPermission.findOne({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    if (existing) {
      console.log("✅ Permission already assigned to role");
    } else {
      console.log("Adding permission to role...");
      // Create junction table entry
      const rolePermission = new RoleApiPermission({
        role_id: role._id,
        api_permission_id: permission._id,
      });
      await rolePermission.save();
      console.log("✅ Added inventory:view:read permission to Inventory Depot role");
    }

    console.log("\n✨ Done!");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addInventoryPermission();
