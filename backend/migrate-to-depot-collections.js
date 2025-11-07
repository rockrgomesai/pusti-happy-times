/**
 * Migration Script: FactoryStoreInventory to Depot Collections
 *
 * This script migrates data from the old FactoryStoreInventory and
 * FactoryStoreInventoryTransaction collections to the new depot-based collections:
 * - FactoryStoreInventory → depotstocks (AGGREGATED by depot + product)
 * - FactoryStoreInventoryTransaction → depottransactionins / depottransactionouts
 *
 * IMPORTANT: DepotStock now only stores aggregated quantities (depot_id, product_id, qty_ctn)
 * All batch details are stored in transaction tables only.
 *
 * Usage: node migrate-to-depot-collections.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const FactoryStoreInventory = require("./src/models/FactoryStoreInventory");
const FactoryStoreInventoryTransaction = require("./src/models/FactoryStoreInventoryTransaction");
const DepotStock = require("./src/models/DepotStock");
const DepotTransactionIn = require("./src/models/DepotTransactionIn");
const DepotTransactionOut = require("./src/models/DepotTransactionOut");

// MongoDB connection string
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

// Statistics
const stats = {
  inventoryRecords: { total: 0, migrated: 0, skipped: 0, errors: 0 },
  transactionRecords: { total: 0, migratedIn: 0, migratedOut: 0, skipped: 0, errors: 0 },
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

/**
 * Migrate FactoryStoreInventory to DepotStock (AGGREGATED)
 * NEW APPROACH: Group by depot_id + product_id, sum all quantities
 * One stock record per depot + product (NOT per batch)
 */
async function migrateInventoryToDepotStock() {
  console.log("\n📦 Migrating FactoryStoreInventory to DepotStock (AGGREGATED)...");

  try {
    const inventoryRecords = await FactoryStoreInventory.find({}).lean();
    stats.inventoryRecords.total = inventoryRecords.length;

    console.log(`Found ${inventoryRecords.length} inventory records to process`);

    // Group records by depot_id + product_id
    const aggregated = {};

    for (const record of inventoryRecords) {
      const key = `${record.facility_store_id}_${record.product_id}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          depot_id: record.facility_store_id,
          product_id: record.product_id,
          qty_ctn: 0,
        };
      }

      // Sum up quantities
      aggregated[key].qty_ctn += parseFloat(record.qty_ctn || 0);
    }

    console.log(
      `Aggregated into ${Object.keys(aggregated).length} unique depot+product combinations`
    );

    // Insert aggregated records
    for (const [key, data] of Object.entries(aggregated)) {
      try {
        // Check if already exists
        const existing = await DepotStock.findOne({
          depot_id: data.depot_id,
          product_id: data.product_id,
        });

        if (existing) {
          console.log(
            `⏭️  Skipping duplicate: depot ${data.depot_id} + product ${data.product_id}`
          );
          stats.inventoryRecords.skipped++;
          continue;
        }

        // Create new aggregated stock record
        const depotStock = new DepotStock({
          depot_id: data.depot_id,
          product_id: data.product_id,
          qty_ctn: data.qty_ctn,
        });

        await depotStock.save();
        stats.inventoryRecords.migrated++;

        console.log(
          `✅ Created stock: depot ${data.depot_id} + product ${data.product_id} = ${data.qty_ctn} ctn`
        );
      } catch (error) {
        console.error(`❌ Error creating stock record ${key}:`, error.message);
        stats.inventoryRecords.errors++;
      }
    }

    console.log(
      `\n✅ Inventory migration complete: ${stats.inventoryRecords.migrated} migrated, ${stats.inventoryRecords.skipped} skipped, ${stats.inventoryRecords.errors} errors`
    );
  } catch (error) {
    console.error("❌ Error in inventory migration:", error);
    throw error;
  }
}

/**
 * Migrate FactoryStoreInventoryTransaction to DepotTransactionIn/Out
 */
async function migrateTransactionsToDepotTransactions() {
  console.log("\n📋 Migrating FactoryStoreInventoryTransaction to DepotTransactionIn/Out...");

  try {
    const transactionRecords = await FactoryStoreInventoryTransaction.find({}).lean();
    stats.transactionRecords.total = transactionRecords.length;

    console.log(`Found ${transactionRecords.length} transaction records to migrate`);

    for (const record of transactionRecords) {
      try {
        // Determine if this is an incoming or outgoing transaction
        const isIncoming = ["receipt", "transfer_in", "return_in", "adjustment_in"].includes(
          record.transaction_type
        );

        if (isIncoming) {
          // Check if already migrated
          const existing = await DepotTransactionIn.findOne({
            depot_id: record.facility_store_id,
            product_id: record.product_id,
            batch_no: record.batch_no,
            transaction_date: record.created_at,
            reference_id: record.reference_id,
          });

          if (existing) {
            stats.transactionRecords.skipped++;
            continue;
          }

          // Map to DepotTransactionIn
          const depotTransactionIn = new DepotTransactionIn({
            depot_id: record.facility_store_id,
            product_id: record.product_id,
            batch_no: record.batch_no,
            production_date: record.production_date,
            expiry_date: record.expiry_date,
            transaction_type:
              record.transaction_type === "receipt"
                ? "from_production"
                : record.transaction_type === "transfer_in"
                  ? "transfer_in"
                  : record.transaction_type === "return_in"
                    ? "return_in"
                    : "adjustment_in",
            qty_ctn: record.qty_ctn,
            balance_after_qty_ctn: record.balance_after || 0,
            reference_type: record.reference_type_model || "ProductionSendToStore",
            reference_id: record.reference_id,
            reference_no: record.reference_no,
            location: record.location || "",
            transaction_date: record.created_at,
            received_date: record.created_at,
            status: record.status || "approved",
            notes: record.notes || "",
            created_by: record.created_by,
            approved_by: record.created_by,
            approved_at: record.created_at,
            is_deleted: false,
            created_at: record.created_at,
            updated_at: record.updated_at,
          });

          await depotTransactionIn.save();
          stats.transactionRecords.migratedIn++;
        } else {
          // Outgoing transaction
          const existing = await DepotTransactionOut.findOne({
            depot_id: record.facility_store_id,
            product_id: record.product_id,
            batch_no: record.batch_no,
            transaction_date: record.created_at,
            reference_id: record.reference_id,
          });

          if (existing) {
            stats.transactionRecords.skipped++;
            continue;
          }

          // Map to DepotTransactionOut
          const depotTransactionOut = new DepotTransactionOut({
            depot_id: record.facility_store_id,
            product_id: record.product_id,
            batch_no: record.batch_no,
            production_date: record.production_date,
            expiry_date: record.expiry_date,
            transaction_type:
              record.transaction_type === "issue"
                ? "to_distributor"
                : record.transaction_type === "transfer_out"
                  ? "transfer_out"
                  : record.transaction_type === "adjustment_out"
                    ? "adjustment_out"
                    : "waste",
            qty_ctn: record.qty_ctn,
            balance_after_qty_ctn: record.balance_after || 0,
            reference_type: record.reference_type_model || "DemandOrder",
            reference_id: record.reference_id,
            reference_no: record.reference_no,
            location: record.location || "",
            transaction_date: record.created_at,
            dispatched_date: record.created_at,
            status: record.status || "approved",
            notes: record.notes || "",
            created_by: record.created_by,
            approved_by: record.created_by,
            approved_at: record.created_at,
            is_deleted: false,
            created_at: record.created_at,
            updated_at: record.updated_at,
          });

          await depotTransactionOut.save();
          stats.transactionRecords.migratedOut++;
        }

        const totalMigrated =
          stats.transactionRecords.migratedIn + stats.transactionRecords.migratedOut;
        if (totalMigrated % 100 === 0) {
          console.log(`✅ Migrated ${totalMigrated} transaction records...`);
        }
      } catch (error) {
        console.error(`❌ Error migrating transaction record ${record._id}:`, error.message);
        stats.transactionRecords.errors++;
      }
    }

    console.log(
      `\n✅ Transaction migration complete: ${stats.transactionRecords.migratedIn} IN, ${stats.transactionRecords.migratedOut} OUT, ${stats.transactionRecords.skipped} skipped, ${stats.transactionRecords.errors} errors`
    );
  } catch (error) {
    console.error("❌ Error in transaction migration:", error);
    throw error;
  }
}

/**
 * Print final migration summary
 */
function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log("\nInventory Records (FactoryStoreInventory → DepotStock):");
  console.log(`  Total: ${stats.inventoryRecords.total}`);
  console.log(`  ✅ Migrated: ${stats.inventoryRecords.migrated}`);
  console.log(`  ⏭️  Skipped: ${stats.inventoryRecords.skipped}`);
  console.log(`  ❌ Errors: ${stats.inventoryRecords.errors}`);

  console.log("\nTransaction Records (FactoryStoreInventoryTransaction → Depot):");
  console.log(`  Total: ${stats.transactionRecords.total}`);
  console.log(`  ✅ Migrated IN: ${stats.transactionRecords.migratedIn}`);
  console.log(`  ✅ Migrated OUT: ${stats.transactionRecords.migratedOut}`);
  console.log(`  ⏭️  Skipped: ${stats.transactionRecords.skipped}`);
  console.log(`  ❌ Errors: ${stats.transactionRecords.errors}`);
  console.log("=".repeat(60));
}

/**
 * Main migration function
 */
async function main() {
  console.log("🚀 Starting migration from FactoryStore to Depot collections...\n");

  try {
    await connectDB();

    // Migrate inventory records
    await migrateInventoryToDepotStock();

    // Migrate transaction records
    await migrateTransactionsToDepotTransactions();

    // Print summary
    printSummary();

    console.log("\n✅ Migration completed successfully!\n");
    console.log("⚠️  IMPORTANT: Review the migrated data before deleting old collections.");
    console.log(
      "⚠️  You can keep the old collections as backup until you confirm everything is working.\n"
    );
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

// Run the migration
main();
