const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-happy-times";

const { ApiPermission, PagePermission } = require("./src/models/Permission");
const Role = require("./src/models/Role");
const SidebarMenuItem = require("./src/models/SidebarMenuItem");
const {
  RoleApiPermission,
  RolePagePermission,
  RoleSidebarMenuItem,
} = require("./src/models/JunctionTables");

async function setupScheduledListPermissions() {
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // 1. Find Distribution role
    const distributionRole = await Role.findOne({ role: "Distribution" });
    if (!distributionRole) {
      console.error("❌ Distribution role not found!");
      process.exit(1);
    }
    console.log("✅ Found Distribution role:", distributionRole._id);

    // 2. Create page permission for Scheduled List
    let pagePermission = await PagePermission.findOne({
      pg_permissions: "pg:ordermanagement:scheduledlist",
    });

    if (!pagePermission) {
      pagePermission = await PagePermission.create({
        pg_permissions: "pg:ordermanagement:scheduledlist",
      });
      console.log("✅ Created page permission:", pagePermission.pg_permissions);
    } else {
      console.log("✅ Page permission already exists:", pagePermission.pg_permissions);
    }

    // 3. Assign page permission to Distribution role
    const existingRolePagePerm = await RolePagePermission.findOne({
      role_id: distributionRole._id,
      pg_permission_id: pagePermission._id,
    });

    if (!existingRolePagePerm) {
      await RolePagePermission.create({
        role_id: distributionRole._id,
        pg_permission_id: pagePermission._id,
      });
      console.log("✅ Assigned page permission to Distribution role");
    } else {
      console.log("✅ Page permission already assigned to Distribution role");
    }

    // 4. Find Order Management parent menu
    const orderManagementMenu = await mongoose.connection.collection("sidebar_menu_items").findOne({
      label: "Order Management",
      parent_id: null,
    });

    if (!orderManagementMenu) {
      console.error("❌ Order Management parent menu not found!");
      process.exit(1);
    }
    console.log("✅ Found Order Management menu:", orderManagementMenu._id);

    // 5. Create sidebar menu item for Scheduled List
    let scheduledListMenu = await mongoose.connection.collection("sidebar_menu_items").findOne({
      label: "Scheduled List",
      href: "/ordermanagement/scheduledlist",
    });

    if (!scheduledListMenu) {
      // Find the highest order number under Order Management
      const existingMenus = await mongoose.connection
        .collection("sidebar_menu_items")
        .find({ parent_id: orderManagementMenu._id })
        .sort({ m_order: -1 })
        .toArray();

      const nextOrder = existingMenus.length > 0 ? existingMenus[0].m_order + 1 : 1;

      scheduledListMenu = await mongoose.connection.collection("sidebar_menu_items").insertOne({
        label: "Scheduled List",
        href: "/ordermanagement/scheduledlist",
        m_order: nextOrder,
        icon: "FaListAlt",
        parent_id: orderManagementMenu._id,
        is_submenu: false,
      });
      scheduledListMenu = { _id: scheduledListMenu.insertedId };
      console.log("✅ Created Scheduled List menu item:", scheduledListMenu._id);
    } else {
      console.log("✅ Scheduled List menu item already exists:", scheduledListMenu._id);
    }

    // 6. Assign menu to Distribution role
    const existingRoleMenu = await RoleSidebarMenuItem.findOne({
      role_id: distributionRole._id,
      sidebar_menu_item_id: scheduledListMenu._id,
    });

    if (!existingRoleMenu) {
      await RoleSidebarMenuItem.create({
        role_id: distributionRole._id,
        sidebar_menu_item_id: scheduledListMenu._id,
      });
      console.log("✅ Assigned Scheduled List menu to Distribution role");
    } else {
      console.log("✅ Scheduled List menu already assigned to Distribution role");
    }

    console.log("\n🎉 Setup complete!");
    console.log("\nSummary:");
    console.log("- Page Permission: pg:ordermanagement:scheduledlist");
    console.log("- Menu Item: Scheduled List (/ordermanagement/scheduledlist)");
    console.log("- Assigned to: Distribution role");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

setupScheduledListPermissions();
