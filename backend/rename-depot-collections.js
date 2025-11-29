/**
 * Migration Script: Rename depot collections to use consistent naming
 * Renames: depotstocks → depot_stocks
 *
 * Run this once before starting the backend with updated models
 * Usage: node rename-depot-collections.js
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function renameCollections() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log("\nExisting collections:", collectionNames);

    // Check if old collection exists
    if (collectionNames.includes("depotstocks") && collectionNames.includes("depot_stocks")) {
      console.log('\n📦 Found BOTH "depotstocks" and "depot_stocks" collections');

      const oldCollection = db.collection("depotstocks");
      const newCollection = db.collection("depot_stocks");
      const oldCount = await oldCollection.countDocuments();
      const newCount = await newCollection.countDocuments();

      console.log(`   depotstocks: ${oldCount} documents`);
      console.log(`   depot_stocks: ${newCount} documents`);

      if (oldCount > 0) {
        console.log('\n📋 Migrating documents from "depotstocks" to "depot_stocks"...');

        const oldDocs = await oldCollection.find({}).toArray();

        for (const doc of oldDocs) {
          // Check if document already exists in new collection (by depot_id + product_id)
          const exists = await newCollection.findOne({
            depot_id: doc.depot_id,
            product_id: doc.product_id,
          });

          if (!exists) {
            await newCollection.insertOne(doc);
            console.log(`   ✅ Migrated: depot=${doc.depot_id}, product=${doc.product_id}`);
          } else {
            console.log(
              `   ⏭️  Skipped (already exists): depot=${doc.depot_id}, product=${doc.product_id}`
            );
          }
        }

        console.log('\n🗑️  Dropping old "depotstocks" collection...');
        await oldCollection.drop();
        console.log("✅ Successfully migrated and dropped old collection");
      } else {
        console.log("\n🗑️  Old collection is empty, dropping it...");
        await oldCollection.drop();
        console.log('✅ Dropped empty "depotstocks" collection');
      }
    } else if (collectionNames.includes("depotstocks")) {
      console.log('\n📦 Found "depotstocks" collection - renaming to "depot_stocks"...');

      const oldCollection = db.collection("depotstocks");
      const count = await oldCollection.countDocuments();
      console.log(`   Contains ${count} documents`);

      await oldCollection.rename("depot_stocks");
      console.log("✅ Successfully renamed: depotstocks → depot_stocks");
    } else if (collectionNames.includes("depot_stocks")) {
      const count = await db.collection("depot_stocks").countDocuments();
      console.log(
        `\n✅ Collection "depot_stocks" already exists (${count} documents) - no migration needed`
      );
    } else {
      console.log(
        '\n⚠️  Neither "depotstocks" nor "depot_stocks" exists - collection will be created on first use'
      );
    }

    // Verify other collections are correctly named
    console.log("\n📋 Verifying other depot collections:");

    if (collectionNames.includes("depot_transactions_in")) {
      const count = await db.collection("depot_transactions_in").countDocuments();
      console.log(`✅ depot_transactions_in exists (${count} documents)`);
    } else {
      console.log("⚠️  depot_transactions_in does not exist yet");
    }

    if (collectionNames.includes("depot_transactions_out")) {
      const count = await db.collection("depot_transactions_out").countDocuments();
      console.log(`✅ depot_transactions_out exists (${count} documents)`);
    } else {
      console.log("⚠️  depot_transactions_out does not exist yet");
    }

    console.log("\n✨ Migration completed successfully!");
    console.log("You can now start the backend with the updated models.\n");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  }
}

// Run the migration
renameCollections();
