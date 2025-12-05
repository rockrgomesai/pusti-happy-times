const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function setupDeliveryChalans() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // 1. Create API Permissions
    console.log("=== CREATING API PERMISSIONS ===");
    const permissionsToCreate = [
      {
        key: "chalan:read",
        description: "View delivery chalans",
        module: "Inventory",
      },
      {
        key: "chalan:create",
        description: "Create delivery chalans",
        module: "Inventory",
      },
      {
        key: "chalan:edit",
        description: "Edit delivery chalans",
        module: "Inventory",
      },
    ];

    const createdPermissions = [];
    for (const perm of permissionsToCreate) {
      const existing = await db.collection("apipermissions").findOne({ key: perm.key });
      if (existing) {
        console.log(`  ℹ️  Permission already exists: ${perm.key}`);
        createdPermissions.push(existing);
      } else {
        const result = await db.collection("apipermissions").insertOne(perm);
        console.log(`  ✅ Created permission: ${perm.key}`);
        createdPermissions.push({ _id: result.insertedId, ...perm });
      }
    }

    // 2. Find Inventory Depot role
    console.log("\n=== FINDING INVENTORY DEPOT ROLE ===");
    const ObjectId = mongoose.Types.ObjectId;
    const inventoryRole = await db
      .collection("roles")
      .findOne({ _id: new ObjectId("690750354bdacd1e192d1ab3") });

    if (!inventoryRole) {
      console.error("❌ Inventory Depot role not found!");
      await mongoose.disconnect();
      return;
    }

    console.log(`Found role: ${inventoryRole.name} (${inventoryRole._id})`);

    // 3. Assign permissions to role
    console.log("\n=== ASSIGNING PERMISSIONS TO ROLE ===");
    for (const perm of createdPermissions) {
      const existing = await db
        .collection("roleapipermissions")
        .findOne({ role_id: inventoryRole._id, api_permission_id: perm._id });

      if (existing) {
        console.log(`  ℹ️  Permission already assigned: ${perm.key}`);
      } else {
        await db.collection("roleapipermissions").insertOne({
          role_id: inventoryRole._id,
          api_permission_id: perm._id,
        });
        console.log(`  ✅ Assigned permission: ${perm.key}`);
      }
    }

    // 4. Create sidebar menu item
    console.log("\n=== CREATING SIDEBAR MENU ITEM ===");
    const menuItem = {
      label: "Delivery Chalans",
      href: "/inventory/delivery-chalans",
      icon: "LocalShipping",
      parent_id: null,
      order: 42,
      active: true,
    };

    // Find Inventory parent menu
    const inventoryMenu = await db
      .collection("sidebarmenuitems")
      .findOne({ label: { $regex: "Inventory", $options: "i" }, parent_id: null });

    if (inventoryMenu) {
      menuItem.parent_id = inventoryMenu._id;
      console.log(`Found Inventory parent menu: ${inventoryMenu.label} (${inventoryMenu._id})`);
    } else {
      console.log("No Inventory parent menu found, creating as top-level menu");
    }

    const existingMenu = await db
      .collection("sidebarmenuitems")
      .findOne({ href: "/inventory/delivery-chalans" });

    if (existingMenu) {
      console.log(`  ℹ️  Menu item already exists: ${existingMenu.label}`);
    } else {
      await db.collection("sidebarmenuitems").insertOne(menuItem);
      console.log(`  ✅ Created menu item: ${menuItem.label}`);
    }

    // 5. Assign menu to role
    console.log("\n=== ASSIGNING MENU TO ROLE ===");
    const menuToAssign =
      existingMenu ||
      (await db.collection("sidebarmenuitems").findOne({ href: "/inventory/delivery-chalans" }));

    if (menuToAssign) {
      const existingRoleMenu = await db
        .collection("rolesidebarmenuitems")
        .findOne({ role_id: inventoryRole._id, sidebar_menu_item_id: menuToAssign._id });

      if (existingRoleMenu) {
        console.log(`  ℹ️  Menu already assigned to role`);
      } else {
        await db.collection("rolesidebarmenuitems").insertOne({
          role_id: inventoryRole._id,
          sidebar_menu_item_id: menuToAssign._id,
        });
        console.log(`  ✅ Assigned menu to role: ${inventoryRole.name}`);
      }
    }

    console.log("\n✅ Setup complete!");
    console.log("\n📋 Summary:");
    console.log(`  - Created/verified 3 API permissions`);
    console.log(`  - Assigned permissions to role: ${inventoryRole.name}`);
    console.log(`  - Created sidebar menu item`);
    console.log(`  - Assigned menu to role`);
    console.log(`\n🔄 Please refresh your browser to see the changes`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

setupDeliveryChalans();
