require("dotenv").config();
const { connectDB } = require("./src/config/database");
const mongoose = require("mongoose");

async function cleanupDepotTransactionCollections() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // ========== HANDLE IN TRANSACTIONS ==========
    console.log("🔵 Processing IN Transaction Collections...\n");

    const hasDepotTransactionsIn =
      (await db.listCollections({ name: "depot_transactions_in" }).toArray()).length > 0;
    const hasDepottransactionins =
      (await db.listCollections({ name: "depottransactionins" }).toArray()).length > 0;

    if (hasDepottransactionins) {
      const mainCount = hasDepotTransactionsIn
        ? await db.collection("depot_transactions_in").countDocuments()
        : 0;
      const dupCount = await db.collection("depottransactionins").countDocuments();

      console.log(`📊 IN Transaction Counts:`);
      console.log(`   depot_transactions_in: ${mainCount} documents`);
      console.log(`   depottransactionins: ${dupCount} documents\n`);

      if (dupCount === 0) {
        console.log("🗑️  Duplicate collection is empty, deleting...");
        await db.collection("depottransactionins").drop();
        console.log("✅ Deleted empty depottransactionins\n");
      } else if (!hasDepotTransactionsIn) {
        console.log("⚠️  Main collection does not exist! Renaming duplicate...");
        await db.collection("depottransactionins").rename("depot_transactions_in");
        console.log("✅ Renamed depottransactionins → depot_transactions_in\n");
      } else {
        // Both exist with data - need to analyze and migrate
        console.log("🔍 Analyzing data differences...");

        const mainDocs = await db.collection("depot_transactions_in").find().toArray();
        const dupDocs = await db.collection("depottransactionins").find().toArray();

        const mainIds = new Set(mainDocs.map((doc) => doc._id.toString()));
        const uniqueInDup = dupDocs.filter((doc) => !mainIds.has(doc._id.toString()));

        console.log(`   Documents unique to duplicate: ${uniqueInDup.length}`);
        console.log(`   Documents in main: ${mainDocs.length}`);
        console.log(`   Documents in duplicate: ${dupDocs.length}\n`);

        if (uniqueInDup.length > 0) {
          console.log("🔄 Migrating unique documents from duplicate to main...");

          for (const doc of uniqueInDup) {
            try {
              await db.collection("depot_transactions_in").insertOne(doc);
              console.log(`   ✅ Migrated: ${doc._id}`);
            } catch (err) {
              console.log(`   ⚠️  Skip (exists): ${doc._id}`);
            }
          }
          console.log("");
        }

        console.log("🗑️  Deleting duplicate collection...");
        await db.collection("depottransactionins").drop();
        console.log("✅ Deleted depottransactionins\n");

        const finalCount = await db.collection("depot_transactions_in").countDocuments();
        console.log(`✨ Final depot_transactions_in count: ${finalCount} documents\n`);
      }
    } else {
      console.log("✅ No duplicate depottransactionins found\n");
    }

    // ========== HANDLE OUT TRANSACTIONS ==========
    console.log("🔴 Processing OUT Transaction Collections...\n");

    const hasDepotTransactionsOut =
      (await db.listCollections({ name: "depot_transactions_out" }).toArray()).length > 0;
    const hasDepottransactionouts =
      (await db.listCollections({ name: "depottransactionouts" }).toArray()).length > 0;

    if (hasDepottransactionouts) {
      const mainCount = hasDepotTransactionsOut
        ? await db.collection("depot_transactions_out").countDocuments()
        : 0;
      const dupCount = await db.collection("depottransactionouts").countDocuments();

      console.log(`📊 OUT Transaction Counts:`);
      console.log(`   depot_transactions_out: ${mainCount} documents`);
      console.log(`   depottransactionouts: ${dupCount} documents\n`);

      if (dupCount === 0) {
        console.log("🗑️  Duplicate collection is empty, deleting...");
        await db.collection("depottransactionouts").drop();
        console.log("✅ Deleted empty depottransactionouts\n");
      } else if (!hasDepotTransactionsOut) {
        console.log("⚠️  Main collection does not exist! Renaming duplicate...");
        await db.collection("depottransactionouts").rename("depot_transactions_out");
        console.log("✅ Renamed depottransactionouts → depot_transactions_out\n");
      } else {
        // Both exist with data - need to analyze and migrate
        console.log("🔍 Analyzing data differences...");

        const mainDocs = await db.collection("depot_transactions_out").find().toArray();
        const dupDocs = await db.collection("depottransactionouts").find().toArray();

        const mainIds = new Set(mainDocs.map((doc) => doc._id.toString()));
        const uniqueInDup = dupDocs.filter((doc) => !mainIds.has(doc._id.toString()));

        console.log(`   Documents unique to duplicate: ${uniqueInDup.length}`);
        console.log(`   Documents in main: ${mainDocs.length}`);
        console.log(`   Documents in duplicate: ${dupDocs.length}\n`);

        if (uniqueInDup.length > 0) {
          console.log("🔄 Migrating unique documents from duplicate to main...");

          for (const doc of uniqueInDup) {
            try {
              await db.collection("depot_transactions_out").insertOne(doc);
              console.log(`   ✅ Migrated: ${doc._id}`);
            } catch (err) {
              console.log(`   ⚠️  Skip (exists): ${doc._id}`);
            }
          }
          console.log("");
        }

        console.log("🗑️  Deleting duplicate collection...");
        await db.collection("depottransactionouts").drop();
        console.log("✅ Deleted depottransactionouts\n");

        const finalCount = await db.collection("depot_transactions_out").countDocuments();
        console.log(`✨ Final depot_transactions_out count: ${finalCount} documents\n`);
      }
    } else {
      console.log("✅ No duplicate depottransactionouts found\n");
    }

    console.log("🎉 Cleanup Complete!");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanupDepotTransactionCollections();
