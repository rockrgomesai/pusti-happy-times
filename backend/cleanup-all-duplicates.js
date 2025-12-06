require("dotenv").config();
const { connectDB } = require("./src/config/database");
const mongoose = require("mongoose");

async function migrateAndCleanup(db, correctName, duplicateName) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📦 Processing: ${correctName} vs ${duplicateName}`);
  console.log("=".repeat(80));

  const hasCorrect = (await db.listCollections({ name: correctName }).toArray()).length > 0;
  const hasDuplicate = (await db.listCollections({ name: duplicateName }).toArray()).length > 0;

  if (!hasDuplicate) {
    console.log(`✅ No duplicate ${duplicateName} found\n`);
    return;
  }

  const correctCount = hasCorrect ? await db.collection(correctName).countDocuments() : 0;
  const dupCount = await db.collection(duplicateName).countDocuments();

  console.log(`\n📊 Current State:`);
  console.log(`   ${correctName}: ${correctCount} docs`);
  console.log(`   ${duplicateName}: ${dupCount} docs\n`);

  if (dupCount === 0) {
    console.log(`🗑️  ${duplicateName} is empty, deleting...`);
    await db.collection(duplicateName).drop();
    console.log(`✅ Deleted ${duplicateName}\n`);
    return;
  }

  if (!hasCorrect) {
    console.log(`⚠️  Main collection doesn't exist! Renaming duplicate...`);
    await db.collection(duplicateName).rename(correctName);
    console.log(`✅ Renamed ${duplicateName} → ${correctName}\n`);
    return;
  }

  // Both exist with data - migrate unique documents
  console.log(`🔍 Analyzing data...`);
  const correctDocs = await db.collection(correctName).find().toArray();
  const dupDocs = await db.collection(duplicateName).find().toArray();

  const correctIds = new Set(correctDocs.map((d) => d._id.toString()));
  const uniqueInDup = dupDocs.filter((d) => !correctIds.has(d._id.toString()));

  console.log(`   Unique in duplicate: ${uniqueInDup.length}`);
  console.log(`   Already in main: ${dupDocs.length - uniqueInDup.length}\n`);

  if (uniqueInDup.length > 0) {
    console.log(`🔄 Migrating ${uniqueInDup.length} unique documents...`);
    let migrated = 0;
    let skipped = 0;

    for (const doc of uniqueInDup) {
      try {
        await db.collection(correctName).insertOne(doc);
        migrated++;
      } catch (err) {
        skipped++;
      }
    }
    console.log(`   ✅ Migrated: ${migrated}`);
    if (skipped > 0) console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log("");
  }

  console.log(`🗑️  Deleting duplicate ${duplicateName}...`);
  await db.collection(duplicateName).drop();
  console.log(`✅ Deleted ${duplicateName}`);

  const finalCount = await db.collection(correctName).countDocuments();
  console.log(`\n✨ Final ${correctName}: ${finalCount} docs\n`);
}

async function cleanupAllDuplicates() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Define all cleanup operations
    const cleanupOps = [
      { correct: "pg_permissions", duplicate: "page_permissions" },
      { correct: "role_pg_permissions", duplicate: "role_page_permissions" },
      { correct: "role_api_permissions", duplicate: "roleapipermissions" },
      { correct: "role_api_permissions", duplicate: "roles_api_permissions" },
      { correct: "role_sidebar_menu_items", duplicate: "rolesidebarmenuitems" },
      { correct: "sidebar_menu_items", duplicate: "sidebarmenuitems" },
      { correct: "loadsheets", duplicate: "load_sheets" }, // Note: loadsheets is correct for LoadSheet model
    ];

    console.log("🚀 Starting cleanup of all duplicate collections...");

    for (const op of cleanupOps) {
      await migrateAndCleanup(db, op.correct, op.duplicate);
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎉 ALL CLEANUP OPERATIONS COMPLETE!");
    console.log("=".repeat(80) + "\n");

    // Final verification
    console.log("📊 Final Verification:\n");
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const expectedCollections = [
      "pg_permissions",
      "role_pg_permissions",
      "role_api_permissions",
      "role_sidebar_menu_items",
      "sidebar_menu_items",
      "loadsheets",
    ];

    for (const name of expectedCollections) {
      if (collectionNames.includes(name)) {
        const count = await db.collection(name).countDocuments();
        console.log(`   ✅ ${name}: ${count} docs`);
      } else {
        console.log(`   ⚠️  ${name}: NOT FOUND`);
      }
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("\n❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanupAllDuplicates();
