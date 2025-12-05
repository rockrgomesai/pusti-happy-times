require("dotenv").config();
const mongoose = require("mongoose");
const LoadSheet = require("./src/models/LoadSheet");
const DepotStock = require("./src/models/DepotStock");

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URI_LOCAL ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function clearData() {
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check load sheets
    const loadSheetCount = await LoadSheet.countDocuments();
    console.log(`\n📋 Load Sheets found: ${loadSheetCount}`);

    if (loadSheetCount > 0) {
      const sheets = await LoadSheet.find().select("load_sheet_no status created_at").limit(5);
      console.log("Sample load sheets:", JSON.stringify(sheets, null, 2));

      await LoadSheet.deleteMany({});
      console.log("✅ Deleted all load sheets");
    }

    // Check and clear blocked quantities
    const stocksWithBlocked = await DepotStock.find({
      blocked_qty: { $exists: true, $ne: null },
    }).select("product_id blocked_qty qty_ctn");

    console.log(`\n📦 Stocks with blocked_qty: ${stocksWithBlocked.length}`);

    if (stocksWithBlocked.length > 0) {
      console.log("Sample blocked stocks:");
      stocksWithBlocked.slice(0, 5).forEach((s) => {
        console.log(`  - Product: ${s.product_id}, Qty: ${s.qty_ctn}, Blocked: ${s.blocked_qty}`);
      });

      await DepotStock.updateMany(
        { blocked_qty: { $exists: true } },
        { $unset: { blocked_qty: 1 } }
      );
      console.log("✅ Cleared all blocked_qty fields");
    }

    console.log("\n✅ Database cleaned successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

clearData();
