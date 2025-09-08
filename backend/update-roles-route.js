/**
 * Update Roles Menu Route Script
 * Pusti Happy Times - Update Roles menu route from /roles to /admin/roles
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const SidebarMenuItem = require("./src/models/SidebarMenuItem");

/**
 * Database connection
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

/**
 * Update roles menu item route
 */
const updateRolesMenuRoute = async () => {
  console.log("Updating Roles menu route...");

  try {
    // Find the Roles menu item
    const rolesMenuItem = await SidebarMenuItem.findOne({ label: "Roles" });

    if (!rolesMenuItem) {
      console.error("❌ Roles menu item not found!");
      return;
    }

    console.log(`📋 Found Roles menu item: ${rolesMenuItem._id}`);
    console.log(`📋 Current href: ${rolesMenuItem.href}`);

    // Update the href from /roles to /admin/roles
    rolesMenuItem.href = "/admin/roles";
    await rolesMenuItem.save();

    console.log(`✅ Updated Roles menu route to: ${rolesMenuItem.href}`);
  } catch (error) {
    console.error("❌ Error updating roles menu route:", error.message);
    throw error;
  }
};

/**
 * Verify the update
 */
const verifyUpdate = async () => {
  console.log("\nVerifying route update...");

  try {
    const rolesMenuItem = await SidebarMenuItem.findOne({ label: "Roles" });

    if (rolesMenuItem && rolesMenuItem.href === "/admin/roles") {
      console.log("🎉 Roles menu route successfully updated to /admin/roles!");
    } else {
      console.log(`⚠️  Unexpected route: ${rolesMenuItem?.href}`);
    }
  } catch (error) {
    console.error("❌ Error verifying update:", error.message);
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    console.log("🚀 Starting Roles Menu Route Update...\n");

    await connectDB();
    await updateRolesMenuRoute();
    await verifyUpdate();

    console.log("\n✅ Roles menu route update completed successfully!");
  } catch (error) {
    console.error("❌ Update failed:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
  }
};

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { main, updateRolesMenuRoute };
