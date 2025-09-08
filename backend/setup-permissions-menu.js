/**
 * Setup Permissions Menu Script
 * Pusti Happy Times - Add Permission Management Menu to Sidebar
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
 * Add permissions menu item to sidebar
 */
const addPermissionsMenuItem = async () => {
  console.log("Adding Permissions menu item...");

  try {
    // First check if Admin menu item exists
    const adminMenuItem = await SidebarMenuItem.findOne({ label: "Admin" });

    if (!adminMenuItem) {
      console.error("❌ Admin menu item not found!");
      return;
    }

    console.log(`✅ Found Admin menu item: ${adminMenuItem._id}`);

    // Check if Permissions menu item already exists
    const existingPermissionsItem = await SidebarMenuItem.findOne({
      label: "Permissions",
      parent_id: adminMenuItem._id,
    });

    if (existingPermissionsItem) {
      console.log("⚠️  Permissions menu item already exists!");
      return existingPermissionsItem;
    }

    // Get the highest m_order for admin submenu items
    const adminSubItems = await SidebarMenuItem.find({
      parent_id: adminMenuItem._id,
    })
      .sort({ m_order: -1 })
      .limit(1);

    const nextOrder =
      adminSubItems.length > 0 ? adminSubItems[0].m_order + 1 : 1;

    // Create Permissions menu item
    const permissionsMenuItem = new SidebarMenuItem({
      label: "Permissions",
      href: "/admin/permissions",
      m_order: nextOrder,
      icon: "FaShieldAlt",
      parent_id: adminMenuItem._id,
      is_submenu: true,
    });

    await permissionsMenuItem.save();
    console.log(`✅ Created Permissions menu item: ${permissionsMenuItem._id}`);

    return permissionsMenuItem;
  } catch (error) {
    console.error("❌ Error adding permissions menu item:", error.message);
    throw error;
  }
};

/**
 * Assign permissions menu to SuperAdmin role
 */
const assignPermissionsToSuperAdmin = async (permissionsMenuItem) => {
  console.log("Assigning Permissions menu to SuperAdmin role...");

  try {
    // Find SuperAdmin role
    const superAdminRole = await Role.findOne({ role: "SuperAdmin" });

    if (!superAdminRole) {
      console.error("❌ SuperAdmin role not found!");
      return;
    }

    console.log(`✅ Found SuperAdmin role: ${superAdminRole._id}`);

    // Check if assignment already exists
    const existingAssignment = await RoleSidebarMenuItem.findOne({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: permissionsMenuItem._id,
    });

    if (existingAssignment) {
      console.log("⚠️  Permissions menu already assigned to SuperAdmin!");
      return;
    }

    // Create role-menu assignment
    const roleMenuAssignment = new RoleSidebarMenuItem({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: permissionsMenuItem._id,
    });

    await roleMenuAssignment.save();
    console.log(`✅ Assigned Permissions menu to SuperAdmin role`);
  } catch (error) {
    console.error(
      "❌ Error assigning permissions menu to SuperAdmin:",
      error.message
    );
    throw error;
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    console.log("🚀 Starting Permissions Menu Setup...\n");

    await connectDB();
    const permissionsMenuItem = await addPermissionsMenuItem();

    if (permissionsMenuItem) {
      await assignPermissionsToSuperAdmin(permissionsMenuItem);
    }

    console.log("\n✅ Permissions menu setup completed successfully!");
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

module.exports = { main, addPermissionsMenuItem };
