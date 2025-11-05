const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const SidebarMenuItem = mongoose.model(
  "SidebarMenuItem",
  new mongoose.Schema({
    label: String,
    href: String,
    icon: String,
    parent_id: mongoose.Schema.Types.ObjectId,
    is_submenu: Boolean,
    order: Number,
    active: Boolean,
  })
);

const ApiPermission = mongoose.model(
  "ApiPermission",
  new mongoose.Schema({
    api_permissions: { type: [String], required: true },
    description: String,
  })
);

const Role = mongoose.model(
  "Role",
  new mongoose.Schema({
    role: { type: String, required: true, unique: true },
    description: String,
  })
);

const RoleSidebarMenuItem = mongoose.model(
  "RoleSidebarMenuItem",
  new mongoose.Schema({
    role: String,
    sidebar_menu_item_id: mongoose.Schema.Types.ObjectId,
  })
);

const RoleApiPermission = mongoose.model(
  "RoleApiPermission",
  new mongoose.Schema({
    role: String,
    api_permission_id: mongoose.Schema.Types.ObjectId,
  })
);

async function setupDemandOrderMenu() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // 1. Create Order Management parent menu
    let orderMgmtMenu = await SidebarMenuItem.findOne({ label: "Order Management" });
    
    if (!orderMgmtMenu) {
      orderMgmtMenu = await SidebarMenuItem.create({
        label: "Order Management",
        href: null,
        icon: "FaShoppingCart",
        parent_id: null,
        is_submenu: false,
        order: 90,
        active: true,
      });
      console.log("✓ Created Order Management parent menu");
    } else {
      console.log("✓ Order Management parent menu already exists");
    }

    // 2. Create Demand Orders submenu
    let demandOrderMenu = await SidebarMenuItem.findOne({
      label: "Demand Orders",
      parent_id: orderMgmtMenu._id,
    });

    if (!demandOrderMenu) {
      demandOrderMenu = await SidebarMenuItem.create({
        label: "Demand Orders",
        href: "/ordermanagement/demandorders",
        icon: "FaFileInvoice",
        parent_id: orderMgmtMenu._id,
        is_submenu: true,
        order: 1,
        active: true,
      });
      console.log("✓ Created Demand Orders submenu");
    } else {
      console.log("✓ Demand Orders submenu already exists");
    }

    // 3. Create API permissions
    const permissions = [
      {
        api_permissions: ["demandorder:read"],
        description: "Read/view demand orders",
      },
      {
        api_permissions: ["demandorder:create"],
        description: "Create new demand orders",
      },
      {
        api_permissions: ["demandorder:update"],
        description: "Update demand orders",
      },
      {
        api_permissions: ["demandorder:delete"],
        description: "Delete demand orders",
      },
    ];

    const createdPermissions = [];
    for (const perm of permissions) {
      let permission = await ApiPermission.findOne({
        api_permissions: perm.api_permissions,
      });

      if (!permission) {
        permission = await ApiPermission.create(perm);
        console.log(`✓ Created permission: ${perm.api_permissions[0]}`);
      } else {
        console.log(`✓ Permission already exists: ${perm.api_permissions[0]}`);
      }
      createdPermissions.push(permission);
    }

    // 4. Get Distributor role
    const distributorRole = await Role.findOne({ role: "Distributor" });
    if (!distributorRole) {
      console.error("✗ Distributor role not found!");
      process.exit(1);
    }

    // 5. Assign menu access to Distributor role
    const existingMenuAccess = await RoleSidebarMenuItem.findOne({
      role: "Distributor",
      sidebar_menu_item_id: demandOrderMenu._id,
    });

    if (!existingMenuAccess) {
      await RoleSidebarMenuItem.create({
        role: "Distributor",
        sidebar_menu_item_id: demandOrderMenu._id,
      });
      console.log("✓ Assigned Demand Orders menu to Distributor role");
    } else {
      console.log("✓ Demand Orders menu already assigned to Distributor role");
    }

    // 6. Assign API permissions to Distributor role
    for (const permission of createdPermissions) {
      const existingPermission = await RoleApiPermission.findOne({
        role: "Distributor",
        api_permission_id: permission._id,
      });

      if (!existingPermission) {
        await RoleApiPermission.create({
          role: "Distributor",
          api_permission_id: permission._id,
        });
        console.log(
          `✓ Assigned ${permission.api_permissions[0]} permission to Distributor role`
        );
      } else {
        console.log(
          `✓ Permission ${permission.api_permissions[0]} already assigned to Distributor role`
        );
      }
    }

    console.log("\n✅ Demand Order menu and permissions setup completed successfully!");
    console.log("\nSummary:");
    console.log("- Parent Menu: Order Management");
    console.log("- Submenu: Demand Orders (/ordermanagement/demandorders)");
    console.log("- Permissions: demandorder:read, create, update, delete");
    console.log("- Assigned to: Distributor role only");

    process.exit(0);
  } catch (error) {
    console.error("Setup error:", error);
    process.exit(1);
  }
}

setupDemandOrderMenu();
