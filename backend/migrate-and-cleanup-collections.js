/**
 * Migrate Data from Incorrect Collections to Correct Ones
 */

const mongoose = require("mongoose");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function migrateAndCleanup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Migration 1: sidebarmenuitems -> sidebar_menu_items
    console.log("📦 Migrating sidebarmenuitems to sidebar_menu_items...");
    const wrongMenuItems = await db.collection("sidebarmenuitems").find({}).toArray();
    console.log(`   Found ${wrongMenuItems.length} documents to migrate`);

    for (const item of wrongMenuItems) {
      // Check if already exists in correct collection
      const exists = await db.collection("sidebar_menu_items").findOne({
        label: item.label,
        path: item.path,
      });

      if (!exists) {
        await db.collection("sidebar_menu_items").insertOne(item);
        console.log(`   ✅ Migrated: ${item.label}`);
      } else {
        console.log(`   ⏭️  Skipped (already exists): ${item.label}`);
      }
    }

    // Migration 2: rolesidebarmenuitems -> role_sidebar_menu_items
    console.log("\n📦 Migrating rolesidebarmenuitems to role_sidebar_menu_items...");
    const wrongRoleMenuItems = await db.collection("rolesidebarmenuitems").find({}).toArray();
    console.log(`   Found ${wrongRoleMenuItems.length} documents to migrate`);

    for (const item of wrongRoleMenuItems) {
      // Check if already exists
      const exists = await db.collection("role_sidebar_menu_items").findOne({
        role_id: item.role_id,
        sidebar_menu_item_id: item.sidebar_menu_item_id,
      });

      if (!exists) {
        await db.collection("role_sidebar_menu_items").insertOne(item);
        console.log(`   ✅ Migrated role-menu assignment`);
      } else {
        console.log(`   ⏭️  Skipped (already exists)`);
      }
    }

    // Migration 3: roleapipermissions -> role_api_permissions
    console.log("\n📦 Migrating roleapipermissions to role_api_permissions...");
    const wrongRoleApiPerms = await db.collection("roleapipermissions").find({}).toArray();
    console.log(`   Found ${wrongRoleApiPerms.length} documents to migrate`);

    for (const item of wrongRoleApiPerms) {
      // Check if already exists
      const exists = await db.collection("role_api_permissions").findOne({
        role_id: item.role_id,
        api_permission_id: item.api_permission_id,
      });

      if (!exists) {
        await db.collection("role_api_permissions").insertOne(item);
        console.log(`   ✅ Migrated role-permission assignment`);
      } else {
        console.log(`   ⏭️  Skipped (already exists)`);
      }
    }

    // Check apipermissions collection
    console.log("\n📦 Checking apipermissions collection...");
    const apiPermsCount = await db.collection("apipermissions").countDocuments();
    console.log(`   Found ${apiPermsCount} documents`);

    if (apiPermsCount > 0) {
      const wrongApiPerms = await db.collection("apipermissions").find({}).toArray();
      for (const item of wrongApiPerms) {
        const exists = await db.collection("api_permissions").findOne({
          api_permissions: item.api_permissions,
        });

        if (!exists) {
          await db.collection("api_permissions").insertOne(item);
          console.log(`   ✅ Migrated: ${item.api_permissions}`);
        } else {
          console.log(`   ⏭️  Skipped (already exists): ${item.api_permissions}`);
        }
      }
    }

    // Cleanup - Drop incorrect collections
    console.log("\n🗑️  Dropping incorrect collections...");

    const collectionsToDelete = [
      "sidebarmenuitems",
      "rolesidebarmenuitems",
      "roleapipermissions",
      "apipermissions",
    ];

    for (const collName of collectionsToDelete) {
      try {
        await db.collection(collName).drop();
        console.log(`   ✅ Dropped: ${collName}`);
      } catch (error) {
        if (error.message.includes("ns not found")) {
          console.log(`   ⏭️  Collection doesn't exist: ${collName}`);
        } else {
          console.log(`   ❌ Error dropping ${collName}: ${error.message}`);
        }
      }
    }

    console.log("\n✨ Migration and cleanup complete!");

    // Final verification
    console.log("\n📊 Final counts:");
    console.log(
      `   sidebar_menu_items: ${await db.collection("sidebar_menu_items").countDocuments()}`
    );
    console.log(
      `   role_sidebar_menu_items: ${await db.collection("role_sidebar_menu_items").countDocuments()}`
    );
    console.log(
      `   role_api_permissions: ${await db.collection("role_api_permissions").countDocuments()}`
    );
    console.log(`   api_permissions: ${await db.collection("api_permissions").countDocuments()}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateAndCleanup();
