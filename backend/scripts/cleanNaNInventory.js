/**
 * Clean up inventory records with NaN quantities
 * Run this script to delete corrupted inventory data
 */

const mongoose = require("mongoose");
const FactoryStoreInventory = require("../src/models/FactoryStoreInventory");
const FactoryStoreInventoryTransaction = require("../src/models/FactoryStoreInventoryTransaction");
const Product = require("../src/models/Product");
const ProductionSendToStore = require("../src/models/ProductionSendToStore");
require("dotenv").config();

async function cleanNaNInventory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ Connected to MongoDB");

    // Find and delete inventory records with NaN
    const nanInventory = await FactoryStoreInventory.find({}).lean();

    let deletedCount = 0;
    for (const record of nanInventory) {
      const qtyCtn = record.qty_ctn?.toString();
      if (qtyCtn === "NaN" || isNaN(parseFloat(qtyCtn))) {
        console.log(`🗑️  Deleting inventory record: ${record._id} (qty_ctn: ${qtyCtn})`);
        await FactoryStoreInventory.deleteOne({ _id: record._id });
        deletedCount++;
      }
    }

    console.log(`✅ Deleted ${deletedCount} inventory records with NaN`);

    // Find and delete transaction records with NaN
    const nanTransactions = await FactoryStoreInventoryTransaction.find({}).lean();

    let deletedTxCount = 0;
    for (const tx of nanTransactions) {
      const qtyCtn = tx.qty_ctn?.toString();
      const balanceAfter = tx.balance_after?.toString();
      if (
        qtyCtn === "NaN" ||
        isNaN(parseFloat(qtyCtn)) ||
        balanceAfter === "NaN" ||
        isNaN(parseFloat(balanceAfter))
      ) {
        console.log(
          `🗑️  Deleting transaction: ${tx._id} (qty_ctn: ${qtyCtn}, balance: ${balanceAfter})`
        );
        await FactoryStoreInventoryTransaction.deleteOne({ _id: tx._id });
        deletedTxCount++;
      }
    }

    console.log(`✅ Deleted ${deletedTxCount} transaction records with NaN`);

    // Reset shipments back to 'sent' status so they can be received again
    const receivedShipments = await ProductionSendToStore.find({ status: "received" });

    for (const shipment of receivedShipments) {
      shipment.status = "sent";
      shipment.received_by = undefined;
      shipment.received_at = undefined;
      await shipment.save();
      console.log(`♻️  Reset shipment ${shipment.ref} back to 'sent' status`);
    }

    console.log(`✅ Reset ${receivedShipments.length} shipments back to 'sent' status`);
    console.log("\n✅ Cleanup complete! You can now receive goods again.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

cleanNaNInventory();
