/**
 * Add Distributor Type Menu Item
 * Adds "Distributor Type" submenu under the Distributor parent menu
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const setup = async () => {
  try {
    console.log("\n🚀 Adding Distributor Type Menu Item...\n");

    const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");

    const db = mongoose.connection.db;
    const menuCollection = db.collection("sidebar_menu_items");

    // Find the Distributor parent menu
    const distributorParent = await menuCollection.findOne({
      label: "Distributor",
      parent_id: null,
    });

    if (!distributorParent) {
      console.error("❌ Distributor parent menu not found");
      process.exit(1);
    }

    console.log(`✅ Found Distributor parent menu (ID: ${distributorParent._id})`);

    // Check if Distributor Type menu already exists
    const existingMenu = await menuCollection.findOne({
      label: "Distributor Type",
    });

    if (existingMenu) {
      console.log("⚠️  Distributor Type menu already exists");
      process.exit(0);
    }

    // Insert Distributor Type menu item
    const newMenuItem = {
      label: "Distributor Type",
      href: "/distributor/distributor-types",
      m_order: 602, // After Distributors (601), before DSR (603)
      icon: "Category",
      parent_id: distributorParent._id,
      is_submenu: true,
    };

    const result = await menuCollection.insertOne(newMenuItem);
    console.log(`✅ Created menu: Distributor Type (${result.insertedId})`);

    // Grant access to SuperAdmin role
    const superAdminRole = await db.collection("roles").findOne({ role: "SuperAdmin" });

    if (superAdminRole) {
      const roleMenuCollection = db.collection("role_sidebar_menu_items");
      
      await roleMenuCollection.insertOne({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: result.insertedId,
      });

      console.log("✅ Granted access to SuperAdmin role");
    }

    // Also create API permissions for distributor types
    const apiPermCollection = db.collection("api_permissions");
    const permissions = [
      {
        api_permissions: "distributor_types:read",
      },
      {
        api_permissions: "distributor_types:create",
      },
      {
        api_permissions: "distributor_types:update",
      },
      {
        api_permissions: "distributor_types:delete",
      },
    ];

    console.log("\n📋 Creating API permissions...");
    for (const perm of permissions) {
      const existingPerm = await apiPermCollection.findOne({ api_permissions: perm.api_permissions });
      
      if (existingPerm) {
        console.log(`⚠️  Permission already exists: ${perm.api_permissions}`);
      } else {
        const permResult = await apiPermCollection.insertOne(perm);
        console.log(`✅ Created permission: ${perm.api_permissions}`);

        // Grant permission to SuperAdmin
        if (superAdminRole) {
          const roleApiPermCollection = db.collection("role_api_permissions");
          await roleApiPermCollection.insertOne({
            role_id: superAdminRole._id,
            api_permission_id: permResult.insertedId,
          });
        }
      }
    }

    console.log("\n✅ Distributor Type menu and permissions setup complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
};

setup();
