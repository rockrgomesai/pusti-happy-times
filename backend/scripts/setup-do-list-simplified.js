/**
 * Setup DO List Module - Simplified
 * Directly inserts to MongoDB collections
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
    return mongoose.connection.db;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

/**
 * Main setup function
 */
const setup = async () => {
  try {
    console.log("\n🚀 Starting DO List Module Setup...\n");
    console.log("=".repeat(60));

    const db = await connectDB();

    // 1. Create API Permissions
    console.log("\n📋 Creating API Permissions...");
    const apiPermsCollection = db.collection("api_permissions");

    const permissions = [
      "do-list:read",
      "do-list:search",
      "do-list:view-details",
      "do-list:view-history",
      "my-do-list:read",
    ];

    for (const perm of permissions) {
      const existing = await apiPermsCollection.findOne({ api_permissions: perm });
      if (existing) {
        console.log(`  ⚠️  Permission already exists: ${perm}`);
      } else {
        await apiPermsCollection.insertOne({ api_permissions: perm });
        console.log(`  ✅ Created permission: ${perm}`);
      }
    }

    // 2. Get user ID for createdBy/updatedBy
    const usersCollection = db.collection("users");
    const adminUser =
      (await usersCollection.findOne({ username: "superadmin" })) ||
      (await usersCollection.findOne({}, { sort: { _id: 1 } }));

    if (!adminUser) {
      console.error("  ❌ No users found in database");
      process.exit(1);
    }

    const adminUserId = adminUser._id;
    console.log(`\n👤 Using user "${adminUser.username}" for audit fields`);

    // 3. Get role IDs
    const rolesCollection = db.collection("roles");
    const fieldRoleNames = ["ASM", "RSM"];
    const hqRoleNames = ["SuperAdmin"];

    const fieldRoles = await rolesCollection.find({ role: { $in: fieldRoleNames } }).toArray();
    const hqRoles = await rolesCollection.find({ role: { $in: hqRoleNames } }).toArray();

    const fieldRoleIds = fieldRoles.map((r) => r._id);
    const hqRoleIds = hqRoles.map((r) => r._id);
    const allRoleIds = [...fieldRoleIds, ...hqRoleIds];

    console.log(`  Found ${fieldRoleIds.length} field roles and ${hqRoleIds.length} HQ roles`);

    // 4. Create Menu Items
    console.log("\n🎯 Creating Menu Items...");
    const menuCollection = db.collection("sidebar_menu_items");

    // DO List menu item
    const doListPath = "/demandorder/do-list";
    const doListExists = await menuCollection.findOne({ path: doListPath });

    if (doListExists) {
      console.log("  ⚠️  DO List menu already exists");
    } else {
      await menuCollection.insertOne({
        title: "DO List",
        label: "DO List",
        description: "View and search demand orders",
        path: doListPath,
        href: doListPath,
        m_order: 150,
        icon: {
          type: "material",
          name: "ListAlt",
          color: "#2196F3",
        },
        parent_id: null,
        parentMenuItem: null,
        is_submenu: false,
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
          cssClasses: [],
          backgroundColor: null,
          textColor: null,
        },
        metadata: {
          keywords: ["DO", "demand order", "list", "search", "orders"],
          category: "Orders",
          isSearchable: true,
          isFavoritable: true,
        },
        createdBy: adminUserId,
        updatedBy: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("  ✅ Created menu item: DO List");
    }

    // My DO List menu item (HQ only)
    const myDoListPath = "/demandorder/my-do-list";
    const myDoListExists = await menuCollection.findOne({ path: myDoListPath });

    if (myDoListExists) {
      console.log("  ⚠️  My DO List menu already exists");
    } else {
      await menuCollection.insertOne({
        title: "My DO List",
        label: "My DO List",
        description: "View your personal demand orders",
        path: myDoListPath,
        href: myDoListPath,
        m_order: 151,
        icon: {
          type: "material",
          name: "PersonOutline",
          color: "#FF9800",
        },
        parent_id: null,
        parentMenuItem: null,
        is_submenu: false,
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
          cssClasses: ["my-do-list"],
          backgroundColor: null,
          textColor: null,
        },
        metadata: {
          keywords: ["my", "DO", "personal", "demand order", "list"],
          category: "Orders",
          isSearchable: true,
          isFavoritable: true,
        },
        createdBy: adminUserId,
        updatedBy: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log("  ✅ Created menu item: My DO List (HQ roles only)");
    }

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
    console.log("   3. Create frontend pages");
    console.log("   4. Implement territory scoping logic");
    console.log("   5. Add search filters: DO#, Distributor, Zone, Region, Area, Date Range\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
};

// Run setup
setup();
