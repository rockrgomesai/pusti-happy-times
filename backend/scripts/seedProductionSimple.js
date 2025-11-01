/**
 * Simple Production Menu Seed
 * Using direct db operations like other working scripts
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // 1. Create Production parent menu if not exists
    const existingParent = await db.collection("sidebar_menu_items").findOne({
      label: "Production",
      parent_id: null,
    });

    let parentId;
    if (existingParent) {
      console.log("✅ Production menu exists");
      parentId = existingParent._id;
    } else {
      const result = await db.collection("sidebar_menu_items").insertOne({
        label: "Production",
        href: null,
        m_order: 6.0,
        icon: "FaIndustry",
        parent_id: null,
        is_submenu: false,
      });
      parentId = result.insertedId;
      console.log(`✅ Created Production menu: ${parentId}`);
    }

    // 2. Create Send to Store submenu
    const existingChild = await db.collection("sidebar_menu_items").findOne({
      label: "Send to Store",
      parent_id: parentId,
    });

    let childId;
    if (existingChild) {
      console.log("✅ Send to Store menu exists");
      childId = existingChild._id;
    } else {
      const result = await db.collection("sidebar_menu_items").insertOne({
        label: "Send to Store",
        href: "/production/sendtostore",
        m_order: 6.1,
        icon: "FaTruck",
        parent_id: parentId,
        is_submenu: false,
      });
      childId = result.insertedId;
      console.log(`✅ Created Send to Store menu: ${childId}`);
    }

    //  API Permissions
    console.log("\n🔐 Creating API permissions...");
    const perms = [
      { resource: "production:send-to-store", action: "read" },
      { resource: "production:send-to-store", action: "create" },
      { resource: "production:send-to-store", action: "update" },
      { resource: "production:send-to-store", action: "delete" },
    ];

    const permIds = [];
    for (const perm of perms) {
      const existing = await db.collection("api_permissions").findOne(perm);
      if (existing) {
        console.log(`✅ Permission exists: ${perm.resource}:${perm.action}`);
        permIds.push(existing._id);
      } else {
        const result = await db.collection("api_permissions").insertOne({
          ...perm,
          description: `${perm.action} production send to store`,
        });
        permIds.push(result.insertedId);
        console.log(`✅ Created permission: ${perm.resource}:${perm.action}`);
      }
    }

    // 4. Page Permission
    const pagePerm = await db.collection("pg_permissions").findOne({
      page_path: "/production/sendtostore",
    });

    let pagePermId;
    if (pagePerm) {
      console.log("✅ Page permission exists");
      pagePermId = pagePerm._id;
    } else {
      const result = await db.collection("pg_permissions").insertOne({
        page_path: "/production/sendtostore",
        page_name: "Production - Send to Store",
        description: "Send manufactured products to factory store",
      });
      pagePermId = result.insertedId;
      console.log(`✅ Created page permission`);
    }

    // 5. Find Production role
    const productionRole = await db.collection("roles").findOne({ role: "Production" });
    if (!productionRole) {
      console.error("❌ Production role not found");
      process.exit(1);
    }
    console.log(`\n✅ Found Production role: ${productionRole._id}`);

    // 6. Assign menus to role
    for (const menuId of [parentId, childId]) {
      const existing = await db.collection("role_sidebar_menu_items").findOne({
        role_id: productionRole._id,
        sidebar_menu_item_id: menuId,
      });

      if (!existing) {
        await db.collection("role_sidebar_menu_items").insertOne({
          role_id: productionRole._id,
          sidebar_menu_item_id: menuId,
        });
        console.log(`✅ Assigned menu to role`);
      }
    }

    // 7. Assign API permissions to role
    for (const permId of permIds) {
      const existing = await db.collection("role_api_permissions").findOne({
        role_id: productionRole._id,
        api_permission_id: permId,
      });

      if (!existing) {
        await db.collection("role_api_permissions").insertOne({
          role_id: productionRole._id,
          api_permission_id: permId,
        });
        console.log(`✅ Assigned API permission to role`);
      }
    }

    // 8. Assign page permission to role
    const existingPageRole = await db.collection("role_pg_permissions").findOne({
      role_id: productionRole._id,
      pg_permission_id: pagePermId,
    });

    if (!existingPageRole) {
      await db.collection("role_pg_permissions").insertOne({
        role_id: productionRole._id,
        pg_permission_id: pagePermId,
      });
      console.log(`✅ Assigned page permission to role`);
    }

    console.log("\n\n✅ ===== SEED COMPLETE =====");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

seed();
