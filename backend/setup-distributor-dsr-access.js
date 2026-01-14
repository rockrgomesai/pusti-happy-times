// Setup full DSR access for Distributor role
// Run this with: node setup-distributor-dsr-access.js

const mongoose = require("mongoose");

async function setupDistributorDSRAccess() {
  try {
    await mongoose.connect(
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin"
    );
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const menuCollection = db.collection("sidebar_menu_items");
    const roleMenuCollection = db.collection("role_sidebar_menu_items");
    const rolesCollection = db.collection("roles");
    const apiPermissionsCollection = db.collection("api_permissions");
    const roleApiPermissionsCollection = db.collection("role_api_permissions");

    // Get Distributor role
    const distributorRole = await rolesCollection.findOne({ role: "Distributor" });
    if (!distributorRole) {
      console.log("❌ Distributor role not found");
      return;
    }
    console.log("✅ Found Distributor role");

    // Get DSR and Distributors menu items
    const dsrMenu = await menuCollection.findOne({ label: "DSR" });
    const distributorsMenu = await menuCollection.findOne({ label: "Distributors" });
    const distributorParentMenu = await menuCollection.findOne({ label: "Distributor" });

    // Assign DSR menu to Distributor role
    if (dsrMenu) {
      const existingDSRMenu = await roleMenuCollection.findOne({
        role_id: distributorRole._id,
        sidebar_menu_item_id: dsrMenu._id,
      });

      if (!existingDSRMenu) {
        await roleMenuCollection.insertOne({
          role_id: distributorRole._id,
          sidebar_menu_item_id: dsrMenu._id,
        });
        console.log("✅ Assigned DSR menu to Distributor role");
      } else {
        console.log("⚠️  DSR menu already assigned to Distributor role");
      }
    }

    // Assign Distributors menu to Distributor role
    if (distributorsMenu) {
      const existingDistributorsMenu = await roleMenuCollection.findOne({
        role_id: distributorRole._id,
        sidebar_menu_item_id: distributorsMenu._id,
      });

      if (!existingDistributorsMenu) {
        await roleMenuCollection.insertOne({
          role_id: distributorRole._id,
          sidebar_menu_item_id: distributorsMenu._id,
        });
        console.log("✅ Assigned Distributors menu to Distributor role");
      } else {
        console.log("⚠️  Distributors menu already assigned to Distributor role");
      }
    }

    // Assign Distributor parent menu to Distributor role
    if (distributorParentMenu) {
      const existingParentMenu = await roleMenuCollection.findOne({
        role_id: distributorRole._id,
        sidebar_menu_item_id: distributorParentMenu._id,
      });

      if (!existingParentMenu) {
        await roleMenuCollection.insertOne({
          role_id: distributorRole._id,
          sidebar_menu_item_id: distributorParentMenu._id,
        });
        console.log("✅ Assigned Distributor parent menu to Distributor role");
      } else {
        console.log("⚠️  Distributor parent menu already assigned to Distributor role");
      }
    }

    // Assign DSR API permissions to Distributor role
    const dsrPermissions = [
      "dsr:create",
      "dsr:read",
      "dsr:update",
      "dsr:delete",
      "dsr:create_user",
    ];

    console.log("\n📋 Setting up DSR API permissions for Distributor role...");
    for (const permissionKey of dsrPermissions) {
      const permission = await apiPermissionsCollection.findOne({ permission: permissionKey });

      if (permission) {
        const existingPermission = await roleApiPermissionsCollection.findOne({
          role_id: distributorRole._id,
          api_permission_id: permission._id,
        });

        if (!existingPermission) {
          await roleApiPermissionsCollection.insertOne({
            role_id: distributorRole._id,
            api_permission_id: permission._id,
          });
          console.log(`✅ Assigned ${permissionKey} permission to Distributor role`);
        } else {
          console.log(`⚠️  ${permissionKey} permission already assigned to Distributor role`);
        }
      } else {
        console.log(`❌ Permission ${permissionKey} not found in database`);
      }
    }

    // Display summary
    console.log("\n📋 Summary of Distributor role permissions:");
    const distributorMenus = await roleMenuCollection
      .find({
        role_id: distributorRole._id,
      })
      .toArray();

    const menuItems = await menuCollection
      .find({
        _id: { $in: distributorMenus.map((m) => m.sidebar_menu_item_id) },
      })
      .toArray();

    console.log("\nMenu Items:");
    menuItems.forEach((item) => {
      console.log(`  ${item.is_submenu ? "  └─" : "●"} ${item.label} (${item.href || "parent"})`);
    });

    const distributorApiPerms = await roleApiPermissionsCollection
      .find({
        role_id: distributorRole._id,
      })
      .toArray();

    const apiPerms = await apiPermissionsCollection
      .find({
        _id: { $in: distributorApiPerms.map((p) => p.api_permission_id) },
      })
      .toArray();

    const dsrApiPerms = apiPerms.filter((p) => p.permission.startsWith("dsr:"));
    console.log("\nDSR API Permissions:");
    dsrApiPerms.forEach((perm) => {
      console.log(`  ● ${perm.permission}`);
    });

    console.log("\n✅ Distributor role now has full control over DSRs!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

setupDistributorDSRAccess();
