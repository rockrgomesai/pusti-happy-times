/**
 * Add inventory:view:read permission to Inventory Depot role
 */

const mongoose = require("mongoose");
const Role = require("./src/models/Role");
const { ApiPermission } = require("./src/models/Permission");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addInventoryPermission() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find Inventory Depot role with populated permissions
    const role = await Role.findOne({ role: "Inventory Depot" }).populate("api_permissions");
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }
    console.log("✅ Found Inventory Depot role:", role._id);

    // Find inventory:view:read permission
    const permission = await ApiPermission.findOne({ api_permissions: "inventory:view:read" });
    if (!permission) {
      console.log("❌ inventory:view:read permission not found");
      console.log("Creating permission...");

      const newPermission = new ApiPermission({
        api_permissions: "inventory:view:read",
      });
      await newPermission.save();
      console.log("✅ Created permission:", newPermission._id);

      role.api_permissions.push(newPermission._id);
      await role.save();
      console.log("✅ Added inventory:view:read permission to Inventory Depot role");
    } else {
      console.log("✅ Found permission:", permission._id);

      // Check if already assigned (ensure api_permissions is initialized)
      if (!role.api_permissions) {
        role.api_permissions = [];
      }

      const isAssigned = role.api_permissions.some((p) => {
        const id = p._id || p;
        return id.toString() === permission._id.toString();
      });

      if (isAssigned) {
        console.log("✅ Permission already assigned");
      } else {
        role.api_permissions.push(permission._id);
        await role.save();
        console.log("✅ Added inventory:view:read permission to Inventory Depot role");
      }
    }

    console.log("\n✨ Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addInventoryPermission();
