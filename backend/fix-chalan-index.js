const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function fixChalanIndex() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("deliverychalans");

    console.log("\nCurrent indexes:");
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop the old chalan_number_1 index if it exists
    console.log("\nDropping old chalan_number_1 index...");
    try {
      await collection.dropIndex("chalan_number_1");
      console.log("✅ Successfully dropped chalan_number_1 index");
    } catch (error) {
      if (error.code === 27 || error.message.includes("index not found")) {
        console.log("ℹ️  Index chalan_number_1 does not exist (already dropped)");
      } else {
        throw error;
      }
    }

    console.log("\nIndexes after fix:");
    const updatedIndexes = await collection.indexes();
    console.log(JSON.stringify(updatedIndexes, null, 2));

    console.log("\n✅ Index fix complete!");
    console.log(
      "The DeliveryChalan model will create the correct chalan_no_1 index automatically."
    );
  } catch (error) {
    console.error("❌ Error fixing index:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

fixChalanIndex();
