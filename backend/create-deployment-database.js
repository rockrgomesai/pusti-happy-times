require("dotenv").config();
const { connectDB } = require("./src/config/database");
const mongoose = require("mongoose");

/**
 * DEPLOYMENT DATABASE PREPARATION SCRIPT
 *
 * This script prepares a clean database export by:
 * 1. Creating a backup of current database
 * 2. Creating a deployment-ready copy with cleaned data
 * 3. Preserving all indexes and collection structures
 * 4. Keeping only essential system and real business data
 *
 * IMPORTANT: This does NOT modify your local development database!
 */

async function createDeploymentDatabase() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const sourceDbName = "pusti_happy_times";
    const deploymentDbName = "pusti_happy_times_deployment";
    const backupDbName = `pusti_happy_times_backup_${Date.now()}`;

    console.log("=".repeat(100));
    console.log("📦 DATABASE DEPLOYMENT PREPARATION");
    console.log("=".repeat(100));
    console.log(`\n📁 Source Database: ${sourceDbName}`);
    console.log(`📁 Deployment Database: ${deploymentDbName}`);
    console.log(`📁 Backup Database: ${backupDbName}\n`);

    // Step 1: Create backup of current database
    console.log("🔄 Step 1: Creating backup of current database...");
    const collections = await db.listCollections().toArray();

    for (const collInfo of collections) {
      const collName = collInfo.name;
      const docs = await db.collection(collName).find().toArray();
      const indexes = await db.collection(collName).indexes();

      if (docs.length > 0) {
        await mongoose.connection.client.db(backupDbName).collection(collName).insertMany(docs);
      }

      // Create indexes in backup (skip _id_ default index)
      for (const index of indexes) {
        if (index.name !== "_id_") {
          const keys = index.key;
          const options = { name: index.name };
          if (index.unique) options.unique = true;
          if (index.sparse) options.sparse = true;
          await mongoose.connection.client
            .db(backupDbName)
            .collection(collName)
            .createIndex(keys, options);
        }
      }
    }
    console.log(`✅ Backup created: ${backupDbName}\n`);

    // Step 2: Define what to keep and what to empty
    const keepWithData = [
      // System configuration
      "api_permissions",
      "pg_permissions",
      "role_api_permissions",
      "role_pg_permissions",
      "role_sidebar_menu_items",
      "sidebar_menu_items",
      "roles",
      // Real business data
      "bd_banks",
      "banks",
    ];

    const emptyCollections = [
      // Fake master data
      "territories",
      "facilities",
      "brands",
      "products",
      "transports",
      "distributors",
      "categories",
      // Transactions
      "demandorders",
      "loadsheets",
      "deliverychalans",
      "deliveryinvoices",
      "schedulings",
      "collections",
      "customerledgers",
      "depottransfers",
      // Inventory
      "depot_stocks",
      "distributorstocks",
      "depot_transactions_in",
      "depot_transactions_out",
      "factorystoreinventories",
      "factorystoreinventorytransactions",
      "production_send_to_store",
      "inventory_manufactured_requisitions",
      // Offers
      "offers",
      "offer_sends",
      "offer_receives",
      // User data (will handle separately)
      "employees",
      "notifications",
      "designations",
      "_temp",
    ];

    // Step 3: Create deployment database
    console.log("🔄 Step 2: Creating deployment database...\n");
    const deployDb = mongoose.connection.client.db(deploymentDbName);

    // Copy collections with data
    console.log("📋 Copying collections with data:");
    for (const collName of keepWithData) {
      const docs = await db.collection(collName).find().toArray();
      const indexes = await db.collection(collName).indexes();

      if (docs.length > 0) {
        await deployDb.collection(collName).insertMany(docs);
        console.log(`   ✅ ${collName}: ${docs.length} documents`);
      }

      // Recreate indexes
      for (const index of indexes) {
        if (index.name !== "_id_") {
          const keys = index.key;
          const options = { name: index.name };
          if (index.unique) options.unique = true;
          if (index.sparse) options.sparse = true;
          await deployDb.collection(collName).createIndex(keys, options);
        }
      }
    }

    // Create empty collections with indexes
    console.log("\n📋 Creating empty collections (preserving indexes):");
    for (const collName of emptyCollections) {
      const sourceExists = collections.find((c) => c.name === collName);
      if (sourceExists) {
        const indexes = await db.collection(collName).indexes();

        // Create collection (by inserting and removing a dummy doc)
        await deployDb.collection(collName).insertOne({ _temp: true });
        await deployDb.collection(collName).deleteMany({});

        // Recreate all indexes
        for (const index of indexes) {
          if (index.name !== "_id_") {
            const keys = index.key;
            const options = { name: index.name };
            if (index.unique) options.unique = true;
            if (index.sparse) options.sparse = true;
            await deployDb.collection(collName).createIndex(keys, options);
          }
        }
        console.log(`   ✅ ${collName}: empty (${indexes.length} indexes preserved)`);
      }
    }

    // Handle users collection specially - keep only superadmin
    console.log("\n📋 Processing users collection:");
    const users = await db.collection("users").find().toArray();
    const superadmin = users.find(
      (u) => u.username === "superadmin" || u.role_id?.toString() === "68be2193ea73210503fa3329"
    );

    if (superadmin) {
      await deployDb.collection("users").insertOne(superadmin);
      console.log(`   ✅ users: 1 document (superadmin only)`);
    }

    const userIndexes = await db.collection("users").indexes();
    for (const index of userIndexes) {
      if (index.name !== "_id_") {
        const keys = index.key;
        const options = { name: index.name };
        if (index.unique) options.unique = true;
        if (index.sparse) options.sparse = true;
        await deployDb.collection("users").createIndex(keys, options);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(100));
    console.log("✅ DEPLOYMENT DATABASE CREATED SUCCESSFULLY");
    console.log("=".repeat(100));
    console.log(`\n📊 Summary:`);
    console.log(`   • Backup created: ${backupDbName}`);
    console.log(`   • Deployment database: ${deploymentDbName}`);
    console.log(`   • Collections with data: ${keepWithData.length}`);
    console.log(`   • Empty collections: ${emptyCollections.length + 1}`);
    console.log(`   • Total collections: ${keepWithData.length + emptyCollections.length + 1}`);

    console.log("\n📝 Next Steps:");
    console.log("   1. Export deployment database:");
    console.log(`      mongodump --db=${deploymentDbName} --out=./deployment_backup`);
    console.log("");
    console.log("   2. Transfer to production server (Contabo):");
    console.log("      scp -r deployment_backup root@your-server-ip:/path/to/backup/");
    console.log("");
    console.log("   3. Import to production MongoDB:");
    console.log(
      `      mongorestore --host localhost --port 27017 --db=pusti_happy_times ./deployment_backup/${deploymentDbName}`
    );
    console.log("");
    console.log("   OR use MongoDB Atlas/Cloud:");
    console.log(
      '      mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/pusti_happy_times" ./deployment_backup/${deploymentDbName}'
    );

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createDeploymentDatabase();
