/**
 * Check Collections Created by Menu Script
 */

const mongoose = require("mongoose");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkCollections() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log("📋 All collections in database:");
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });

    // Check if wrong collections exist
    const wrongCollections = ["sidebarmenuitems", "rolesidebarmenuitems", "roleapipermissions"];

    console.log("\n❌ Incorrectly named collections:");
    for (const name of wrongCollections) {
      const exists = collections.find((c) => c.name === name);
      if (exists) {
        const count = await db.collection(name).countDocuments();
        console.log(`   - ${name}: ${count} documents`);
      }
    }

    // Check correct collections
    const correctCollections = [
      "sidebar_menu_items",
      "role_sidebar_menu_items",
      "role_api_permissions",
    ];

    console.log("\n✅ Correctly named collections:");
    for (const name of correctCollections) {
      const exists = collections.find((c) => c.name === name);
      if (exists) {
        const count = await db.collection(name).countDocuments();
        console.log(`   - ${name}: ${count} documents`);
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkCollections();
