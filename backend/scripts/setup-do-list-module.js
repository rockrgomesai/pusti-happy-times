/**
 * Setup DO List Module
 * Creates necessary permissions, API permissions, and menu items for DO List functionality
 *
 * Features:
 * - DO List page (territory-scoped for field roles, all DOs for HQ roles)
 * - My DO List page (HQ roles only - personalized view)
 * - Mobile-first design
 * - Role-based access using roles.role field
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

// Import models
const SidebarMenuItem = require("../src/models/SidebarMenuItem");
const { ApiPermission } = require("../src/models/Permission");
const Role = require("../src/models/Role");
const User = require("../src/models/User");

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

/**
 * Role Classification
 * Field Roles: Territory-scoped access
 * HQ Roles: See all DOs + have "My DO List"
 */
const FIELD_ROLES = ["ASM", "RSM", "TSO", "Territory Manager"];
const HQ_ROLES = ["Finance Manager", "Finance Admin", "Admin", "SuperAdmin"];

/**
 * Create API Permissions for DO List
 */
const createApiPermissions = async () => {
  console.log("\n📋 Creating API Permissions...");

  const permissions = [
    "do-list:read",
    "do-list:search",
    "do-list:view-details",
    "do-list:view-history",
    "my-do-list:read",
  ];

  for (const perm of permissions) {
    try {
      const existing = await ApiPermission.findOne({ api_permissions: perm });
      if (existing) {
        console.log(`  ⚠️  Permission already exists: ${perm}`);
      } else {
        await ApiPermission.create({ api_permissions: perm });
        console.log(`  ✅ Created permission: ${perm}`);
      }
    } catch (error) {
      console.error(`  ❌ Error creating permission ${perm}:`, error.message);
    }
  }
};

/**
 * Create Menu Items for DO List
 */
const createMenuItems = async () => {
  console.log("\n🎯 Creating Menu Items...");

  // Get any admin user for createdBy/updatedBy
  let adminUser = await User.findOne({ username: "admin" });
  if (!adminUser) {
    adminUser = await User.findOne().sort({ createdAt: 1 }).limit(1);
  }

  if (!adminUser) {
    console.error("  ❌ No users found in database. Please create at least one user first.");
    return;
  }

  const adminUserId = adminUser._id;
  console.log(`  Using user "${adminUser.username}" for createdBy/updatedBy fields`);

  // Get role IDs for restrictToRoles
  const fieldRoleIds = [];
  const hqRoleIds = [];

  for (const roleName of FIELD_ROLES) {
    const role = await Role.findOne({ role: roleName });
    if (role) fieldRoleIds.push(role._id);
  }

  for (const roleName of HQ_ROLES) {
    const role = await Role.findOne({ role: roleName });
    if (role) hqRoleIds.push(role._id);
  }

  const allRoleIds = [...fieldRoleIds, ...hqRoleIds];

  console.log(`  Found ${fieldRoleIds.length} field roles and ${hqRoleIds.length} HQ roles`);

  // 1. DO List (All users with territory scoping)
  const doListMenuItem = {
    title: "DO List",
    description: "View and search demand orders",
    path: "/demandorder/do-list",
    icon: {
      type: "material",
      name: "ListAlt",
      color: "#2196F3",
    },
    parentMenuItem: null,
    level: 0,
    sortOrder: 150,
    active: true,
    visibility: {
      showInSidebar: true,
      showInBreadcrumb: true,
      showInMobile: true,
      restrictToRoles: allRoleIds,
    },
    behavior: {
      openInNewTab: false,
      expandByDefault: false,
      exactMatch: true,
      isExternal: false,
    },
    permissions: {
      menuPermission: null,
      pagePermission: null,
      requireAllPermissions: false,
    },
    styling: {
      badgeText: "",
      badgeColor: "",
      customClass: "",
      highlightOnNew: false,
    },
    metadata: {
      keywords: ["DO", "demand order", "list", "search", "orders"],
      category: "Orders",
      isSearchable: true,
      isFavoritable: true,
    },
    createdBy: adminUserId,
    updatedBy: adminUserId,
  };

  try {
    const existing = await SidebarMenuItem.findOne({ path: "/demandorder/do-list" });
    if (existing) {
      console.log("  ⚠️  Menu item already exists: DO List");
    } else {
      await SidebarMenuItem.create(doListMenuItem);
      console.log("  ✅ Created menu item: DO List");
    }
  } catch (error) {
    console.error("  ❌ Error creating DO List menu:", error.message);
  }

  // 2. My DO List (HQ roles only)
  const myDoListMenuItem = {
    title: "My DO List",
    description: "View your personal demand orders",
    path: "/demandorder/my-do-list",
    icon: {
      type: "material",
      name: "PersonOutline",
      color: "#FF9800",
    },
    parentMenuItem: null,
    level: 0,
    sortOrder: 151,
    active: true,
    visibility: {
      showInSidebar: true,
      showInBreadcrumb: true,
      showInMobile: true,
      restrictToRoles: hqRoleIds, // HQ roles only
    },
    behavior: {
      openInNewTab: false,
      expandByDefault: false,
      exactMatch: true,
      isExternal: false,
    },
    permissions: {
      menuPermission: null,
      pagePermission: null,
      requireAllPermissions: false,
    },
    styling: {
      badgeText: "",
      badgeColor: "#FF9800",
      customClass: "my-do-list",
      highlightOnNew: true,
    },
    metadata: {
      keywords: ["my", "DO", "personal", "demand order", "list"],
      category: "Orders",
      isSearchable: true,
      isFavoritable: true,
    },
    createdBy: adminUserId,
    updatedBy: adminUserId,
  };

  try {
    const existing = await SidebarMenuItem.findOne({ path: "/demandorder/my-do-list" });
    if (existing) {
      console.log("  ⚠️  Menu item already exists: My DO List");
    } else {
      await SidebarMenuItem.create(myDoListMenuItem);
      console.log("  ✅ Created menu item: My DO List (HQ roles only)");
    }
  } catch (error) {
    console.error("  ❌ Error creating My DO List menu:", error.message);
  }
};

/**
 * Main setup function
 */
const setup = async () => {
  try {
    console.log("\n🚀 Starting DO List Module Setup...\n");
    console.log("=".repeat(60));

    await connectDB();
    await createApiPermissions();
    await createMenuItems();

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ DO List Module Setup Complete!\n");
    console.log("📝 Summary:");
    console.log("   - API Permissions created for DO List operations");
    console.log('   - Menu item "DO List" created (all roles, territory-scoped)');
    console.log('   - Menu item "My DO List" created (HQ roles only)');
    console.log("   - Mobile-first design enabled");
    console.log("\n🔧 Next Steps:");
    console.log("   1. Assign API permissions to roles in role_api_permissions");
    console.log("   2. Create backend routes for /api/v1/demandorders/do-list");
    console.log("   3. Create frontend pages: /demandorder/do-list and /demandorder/my-do-list");
    console.log("   4. Implement territory scoping logic in backend");
    console.log("   5. Add search filters: DO#, Distributor, Zone, Region, Area, Date Range\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
};

// Run setup
setup();
