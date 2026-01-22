/**
 * Migration Script: Convert DistributorStock to FIFO Batches
 *
 * This script migrates existing distributor stock from simple quantity tracking
 * to FIFO (First-In-First-Out) batch tracking with price history.
 *
 * Usage: cd backend && node migrate-distributor-stock-to-fifo.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-erp", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Import models
const DistributorStock = require("./src/models/DistributorStock");
const Product = require("./src/models/Product");

const migrateDistributorStock = async () => {
  console.log("\n🔄 Starting DistributorStock FIFO Migration...\n");

  try {
    // Get all distributor stock records (no session - works with standalone MongoDB)
    const stockRecords = await DistributorStock.find({});
    console.log(`📊 Found ${stockRecords.length} stock records to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const stock of stockRecords) {
      try {
        // Skip if already has batches (already migrated)
        if (stock.batches && stock.batches.length > 0) {
          console.log(`⏭️  Skipping ${stock.sku} - already has batches`);
          skipped++;
          continue;
        }

        const currentQty = parseFloat(stock.qty?.toString() || 0);

        // Skip if quantity is 0 or negative
        if (currentQty <= 0) {
          console.log(`⏭️  Skipping ${stock.sku} - zero or negative quantity`);
          skipped++;
          continue;
        }

        // Get current product price
        const product = await Product.findOne({ sku: stock.sku });
        if (!product) {
          console.log(`⚠️  Warning: Product not found for SKU ${stock.sku}, using price 0`);
        }

        const unitPrice = product ? parseFloat(product.db_price || product.trade_price || 0) : 0;

        // Create a single batch for existing stock
        // Since we don't have historical data, we create one batch with current quantity
        const batch = {
          batch_id: `MIGRATION-${new Date()
            .toISOString()
            .replace(/[-:T.Z]/g, "")
            .substring(0, 14)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          qty: currentQty,
          unit_price: unitPrice,
          received_at: stock.last_received_at || stock.createdAt || new Date(),
          chalan_id: stock.last_chalan_id || null,
          chalan_no: stock.last_chalan_id ? `CHN-${stock.last_chalan_id}` : "MIGRATION",
        };

        // Update stock with batch
        stock.batches = [batch];

        await stock.save();

        console.log(
          `✅ Migrated ${stock.sku} - Qty: ${currentQty}, Price: ${unitPrice}, Batch ID: ${batch.batch_id}`
        );
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating ${stock.sku}:`, error.message);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`⏭️  Skipped (already migrated or zero qty): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${migrated + skipped + errors}`);
    console.log("=".repeat(60) + "\n");

    if (errors > 0) {
      console.log("⚠️  Migration completed with errors. Please review error messages above.");
    } else if (migrated > 0) {
      console.log("🎉 Migration completed successfully!");
    } else {
      console.log("ℹ️  No records needed migration.");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateDistributorStock();
    console.log("\n✅ All done! Disconnecting...\n");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Execute
runMigration();
