/**
 * Update Roles Menu Icon Script
 * Pusti Happy Times - Update Roles menu icon to FaUserTag
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
 * Update roles menu item icon
 */
const updateRolesMenuIcon = async () => {
  console.log("Updating Roles menu icon...");

  try {
    // Find the Roles menu item
    const rolesMenuItem = await SidebarMenuItem.findOne({ label: "Roles" });

    if (!rolesMenuItem) {
      console.error("❌ Roles menu item not found!");
      return;
    }

    console.log(`📋 Found Roles menu item: ${rolesMenuItem._id}`);
    console.log(`📋 Current icon: ${rolesMenuItem.icon}`);

    // Update the icon to FaUserTag
    rolesMenuItem.icon = "FaUserTag";
    await rolesMenuItem.save();

    console.log(`✅ Updated Roles menu icon to: ${rolesMenuItem.icon}`);
  } catch (error) {
    console.error("❌ Error updating roles menu icon:", error.message);
    throw error;
  }
};

/**
 * Verify the update
 */
const verifyUpdate = async () => {
  console.log("\nVerifying icon update...");

  try {
    const rolesMenuItem = await SidebarMenuItem.findOne({ label: "Roles" });

    if (rolesMenuItem && rolesMenuItem.icon === "FaUserTag") {
      console.log("🎉 Roles menu icon successfully updated to FaUserTag!");
    } else {
      console.log(`⚠️  Unexpected icon: ${rolesMenuItem?.icon}`);
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
    console.log("🚀 Starting Roles Menu Icon Update...\n");

    await connectDB();
    await updateRolesMenuIcon();
    await verifyUpdate();

    console.log("\n✅ Roles menu icon update completed successfully!");
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

module.exports = { main, updateRolesMenuIcon };
