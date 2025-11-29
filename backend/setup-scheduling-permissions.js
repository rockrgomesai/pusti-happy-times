const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-happy-times";

async function setupSchedulingPermissions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Import models
    const { ApiPermission, PagePermission } = require("./src/models/Permission");
    const { Role } = require("./src/models");
    const {
      RoleApiPermission,
      RolePagePermission,
      RoleSidebarMenuItem,
    } = require("./src/models/JunctionTables");

    // Get or define SidebarMenuItem model
    let SidebarMenuItem;
    try {
      SidebarMenuItem = mongoose.model("SidebarMenuItem");
    } catch (error) {
      SidebarMenuItem = mongoose.model(
        "SidebarMenuItem",
        new mongoose.Schema({
          label: String,
          href: String,
          icon: String,
          parent_id: mongoose.Schema.Types.ObjectId,
          order: Number,
          active: Boolean,
        })
      );
    }

    // 1. Create API Permissions
    console.log("\n1. Creating API permissions...");
    const apiPermissions = ["scheduling:read", "scheduling:create", "scheduling:approve"];

    for (const permName of apiPermissions) {
      const existing = await ApiPermission.findOne({ api_permissions: permName });
      if (!existing) {
        await ApiPermission.create({ api_permissions: permName });
        console.log(`  ✓ Created: ${permName}`);
      } else {
        console.log(`  - Already exists: ${permName}`);
      }
    }

    // 2. Create Page Permission
    console.log("\n2. Creating page permission...");
    const pagePermKey = "pg:ordermanagement:schedulings";
    let pagePermission = await PagePermission.findOne({ pg_permissions: pagePermKey });
    if (!pagePermission) {
      pagePermission = await PagePermission.create({
        pg_permissions: pagePermKey,
      });
      console.log(`  ✓ Created: ${pagePermKey}`);
    } else {
      console.log(`  - Already exists: ${pagePermKey}`);
    }

    // 3. Find Distribution and Finance roles
    console.log("\n3. Finding roles...");
    const distributionRole = await Role.findOne({ role: "Distribution" });
    const financeRole = await Role.findOne({ role: "Finance" });

    if (!distributionRole) {
      console.error("  ✗ Distribution role not found!");
      return;
    }
    if (!financeRole) {
      console.error("  ✗ Finance role not found!");
      return;
    }
    console.log(`  ✓ Found Distribution role: ${distributionRole._id}`);
    console.log(`  ✓ Found Finance role: ${financeRole._id}`);

    // 4. Assign API permissions to Distribution role
    console.log("\n4. Assigning API permissions to Distribution...");
    const distributionApiPerms = ["scheduling:read", "scheduling:create"];
    for (const permName of distributionApiPerms) {
      const apiPerm = await ApiPermission.findOne({ api_permissions: permName });
      if (apiPerm) {
        const existing = await RoleApiPermission.findOne({
          role_id: distributionRole._id,
          api_permission_id: apiPerm._id,
        });
        if (!existing) {
          await RoleApiPermission.create({
            role_id: distributionRole._id,
            api_permission_id: apiPerm._id,
          });
          console.log(`  ✓ Assigned: ${permName}`);
        } else {
          console.log(`  - Already assigned: ${permName}`);
        }
      }
    }

    // 5. Assign approval permissions to Finance role
    console.log("\n5. Assigning approval permissions to Finance...");
    const financeApiPerms = ["scheduling:read", "scheduling:approve"];
    for (const permName of financeApiPerms) {
      const apiPerm = await ApiPermission.findOne({ api_permissions: permName });
      if (apiPerm) {
        const existing = await RoleApiPermission.findOne({
          role_id: financeRole._id,
          api_permission_id: apiPerm._id,
        });
        if (!existing) {
          await RoleApiPermission.create({
            role_id: financeRole._id,
            api_permission_id: apiPerm._id,
          });
          console.log(`  ✓ Assigned: ${permName}`);
        } else {
          console.log(`  - Already assigned: ${permName}`);
        }
      }
    }

    // 6. Assign page permission to Distribution
    console.log("\n6. Assigning page permission to Distribution...");
    const existingPagePerm = await RolePagePermission.findOne({
      role_id: distributionRole._id,
      pg_permission_id: pagePermission._id,
    });
    if (!existingPagePerm) {
      await RolePagePermission.create({
        role_id: distributionRole._id,
        pg_permission_id: pagePermission._id,
      });
      console.log(`  ✓ Assigned page permission`);
    } else {
      console.log(`  - Page permission already assigned`);
    }

    // 7. Create sidebar menu item
    console.log("\n7. Creating sidebar menu item...");
    const menuCollection = mongoose.connection.collection("sidebar_menu_items");

    const omParent = await menuCollection.findOne({ label: "Order Management" });
    if (!omParent) {
      console.error("  ✗ Order Management parent menu not found!");
      return;
    }

    const existingMenu = await menuCollection.findOne({ href: "/ordermanagement/schedulings" });
    let schedulingsMenu;
    if (!existingMenu) {
      // Find max order in Order Management submenu
      const siblings = await menuCollection
        .find({ parent_id: omParent._id })
        .sort({ m_order: -1 })
        .limit(1)
        .toArray();
      const maxOrder = siblings.length > 0 ? siblings[0].m_order : 0;

      const menuData = {
        label: "Schedulings",
        href: "/ordermanagement/schedulings",
        icon: "FaCalendar",
        parent_id: omParent._id,
        m_order: maxOrder + 1,
        is_submenu: true,
      };

      const result = await menuCollection.insertOne(menuData);
      schedulingsMenu = { _id: result.insertedId, ...menuData };
      console.log(`  ✓ Created menu item: Schedulings`);
    } else {
      schedulingsMenu = existingMenu;
      console.log(`  - Menu item already exists`);
    }

    // 8. Assign menu to Distribution role
    console.log("\n8. Assigning menu to Distribution role...");
    const existingRoleMenu = await RoleSidebarMenuItem.findOne({
      role_id: distributionRole._id,
      sidebar_menu_item_id: schedulingsMenu._id,
    });
    if (!existingRoleMenu) {
      await RoleSidebarMenuItem.create({
        role_id: distributionRole._id,
        sidebar_menu_item_id: schedulingsMenu._id,
      });
      console.log(`  ✓ Assigned menu to Distribution`);
    } else {
      console.log(`  - Menu already assigned to Distribution`);
    }

    // Also assign to Finance for approval
    const existingFinanceMenu = await RoleSidebarMenuItem.findOne({
      role_id: financeRole._id,
      sidebar_menu_item_id: schedulingsMenu._id,
    });
    if (!existingFinanceMenu) {
      await RoleSidebarMenuItem.create({
        role_id: financeRole._id,
        sidebar_menu_item_id: schedulingsMenu._id,
      });
      console.log(`  ✓ Assigned menu to Finance`);
    } else {
      console.log(`  - Menu already assigned to Finance`);
    }

    console.log("\n✓ Scheduling permissions setup complete!");
    console.log("\nSummary:");
    console.log("- API Permissions: scheduling:read, scheduling:create, scheduling:approve");
    console.log("- Page Permission: page:ordermanagement:schedulings");
    console.log("- Distribution Role: Can read and create schedulings");
    console.log("- Finance Role: Can read and approve/reject schedulings");
    console.log("- Menu Item: /ordermanagement/schedulings (visible to Distribution & Finance)");
  } catch (error) {
    console.error("Error setting up scheduling permissions:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
  }
}

setupSchedulingPermissions();
