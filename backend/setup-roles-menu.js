/**
 * Add Roles Menu Item Script
 * Pusti Happy Times - Add Role Management Menu to Sidebar
 *
 * This script adds the Roles menu item as a child of Admin in the sidebar
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const SidebarMenuItem = require("./src/models/SidebarMenuItem");
const Role = require("./src/models/Role");
const { RoleSidebarMenuItem } = require("./src/models/JunctionTables");

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
 * Add roles menu item to sidebar
 */
const addRolesMenuItem = async () => {
  console.log("Adding Roles menu item...");

  try {
    // First check if Admin menu item exists
    const adminMenuItem = await SidebarMenuItem.findOne({ label: "Admin" });

    if (!adminMenuItem) {
      console.log("Admin menu item not found, creating it first...");

      // Create Admin menu item
      const newAdminMenuItem = new SidebarMenuItem({
        label: "Admin",
        href: null, // Parent items don't have href
        icon: "FaCrown",
        m_order: 90, // Put it near the end
        parent_id: null,
        is_submenu: false,
      });

      await newAdminMenuItem.save();
      console.log("✅ Created Admin menu item");

      // Update the adminMenuItem reference
      const savedAdminMenuItem = await SidebarMenuItem.findById(
        newAdminMenuItem._id
      );
      adminMenuItem = savedAdminMenuItem;
    }

    console.log(`📋 Found/Created Admin menu item: ${adminMenuItem._id}`);

    // Check if Roles menu item already exists
    const existingRolesMenuItem = await SidebarMenuItem.findOne({
      label: "Roles",
      parent_id: adminMenuItem._id,
    });

    if (existingRolesMenuItem) {
      console.log("ℹ️  Roles menu item already exists");
      return existingRolesMenuItem;
    }

    // Create Roles menu item
    const rolesMenuItem = new SidebarMenuItem({
      label: "Roles",
      href: "/roles",
      icon: "FaKey",
      m_order: 10, // First item under Admin
      parent_id: adminMenuItem._id,
      is_submenu: true,
    });

    await rolesMenuItem.save();
    console.log("✅ Created Roles menu item");

    return rolesMenuItem;
  } catch (error) {
    console.error("❌ Error adding roles menu item:", error.message);
    throw error;
  }
};

/**
 * Assign roles menu item to SuperAdmin role
 */
const assignRolesMenuToSuperAdmin = async (rolesMenuItem) => {
  console.log("Assigning Roles menu to SuperAdmin...");

  try {
    // Find SuperAdmin role
    const superAdminRole = await Role.findOne({ role: "SuperAdmin" });
    if (!superAdminRole) {
      console.error("❌ SuperAdmin role not found!");
      return;
    }

    console.log(`📋 Found SuperAdmin role: ${superAdminRole._id}`);

    // Check if assignment already exists
    const existingAssignment = await RoleSidebarMenuItem.findOne({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: rolesMenuItem._id,
    });

    if (existingAssignment) {
      console.log("ℹ️  Roles menu already assigned to SuperAdmin");
      return;
    }

    // Create assignment
    const menuAssignment = new RoleSidebarMenuItem({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: rolesMenuItem._id,
    });

    await menuAssignment.save();
    console.log("✅ Assigned Roles menu to SuperAdmin");

    // Also assign the Admin parent menu if not already assigned
    const adminMenuItem = await SidebarMenuItem.findById(
      rolesMenuItem.parent_id
    );
    if (adminMenuItem) {
      const existingAdminAssignment = await RoleSidebarMenuItem.findOne({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: adminMenuItem._id,
      });

      if (!existingAdminAssignment) {
        const adminMenuAssignment = new RoleSidebarMenuItem({
          role_id: superAdminRole._id,
          sidebar_menu_item_id: adminMenuItem._id,
        });

        await adminMenuAssignment.save();
        console.log("✅ Assigned Admin menu to SuperAdmin");
      }
    }
  } catch (error) {
    console.error(
      "❌ Error assigning roles menu to SuperAdmin:",
      error.message
    );
    throw error;
  }
};

/**
 * Verify menu assignment
 */
const verifyMenuAssignment = async () => {
  console.log("\nVerifying menu assignment...");

  try {
    const superAdminRole = await Role.findOne({ role: "SuperAdmin" });
    if (!superAdminRole) {
      console.error("❌ SuperAdmin role not found!");
      return;
    }

    const assignedMenus = await RoleSidebarMenuItem.find({
      role_id: superAdminRole._id,
    }).populate("sidebar_menu_item_id", "label href");

    console.log(
      `✅ SuperAdmin has ${assignedMenus.length} menu items assigned:`
    );

    assignedMenus.forEach((menu) => {
      console.log(
        `   - ${menu.sidebar_menu_item_id.label} (${menu.sidebar_menu_item_id.href || "parent menu"})`
      );
    });

    // Check specifically for Roles menu
    const rolesMenuAssigned = assignedMenus.find(
      (menu) => menu.sidebar_menu_item_id.label === "Roles"
    );

    if (rolesMenuAssigned) {
      console.log("🎉 Roles menu successfully assigned to SuperAdmin!");
    } else {
      console.log("⚠️  Roles menu not found in SuperAdmin assignments");
    }
  } catch (error) {
    console.error("❌ Error verifying menu assignment:", error.message);
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    console.log("🚀 Starting Roles Menu Setup...\n");

    await connectDB();
    const rolesMenuItem = await addRolesMenuItem();
    await assignRolesMenuToSuperAdmin(rolesMenuItem);
    await verifyMenuAssignment();

    console.log("\n✅ Roles menu setup completed successfully!");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
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

module.exports = { main, addRolesMenuItem, assignRolesMenuToSuperAdmin };
