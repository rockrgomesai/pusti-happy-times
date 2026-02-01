/**
 * Migration Script: Clear Old Outlet Market Size Records
 *
 * This script removes all existing OutletMarketSize records that don't have
 * the outlet field (records created before the schema update).
 *
 * Run this script before using the updated OutletMarketSize module.
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function clearOutletMarketSizes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    const OutletMarketSize = mongoose.model(
      "OutletMarketSize",
      new mongoose.Schema({}, { strict: false })
    );

    // Count existing records
    const totalCount = await OutletMarketSize.countDocuments({});
    console.log(`Total OutletMarketSize records found: ${totalCount}`);

    // Count records without outlet field
    const recordsWithoutOutlet = await OutletMarketSize.countDocuments({
      outlet: { $exists: false },
    });
    console.log(`Records without outlet field: ${recordsWithoutOutlet}`);

    if (recordsWithoutOutlet > 0) {
      console.log("\nDeleting records without outlet field...");
      const result = await OutletMarketSize.deleteMany({ outlet: { $exists: false } });
      console.log(`✓ Deleted ${result.deletedCount} old records`);
    } else {
      console.log("\n✓ No old records to delete. Collection is clean.");
    }

    // Display remaining records
    const remainingCount = await OutletMarketSize.countDocuments({});
    console.log(`\nRemaining OutletMarketSize records: ${remainingCount}`);

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

// Run the migration
clearOutletMarketSizes();
