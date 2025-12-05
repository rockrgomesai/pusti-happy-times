require("dotenv").config();
const mongoose = require("mongoose");

async function checkLoadSheets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const LoadSheet = mongoose.model(
      "LoadSheet",
      new mongoose.Schema({}, { strict: false }),
      "load_sheets"
    );

    const loadSheets = await LoadSheet.find({}).sort({ created_at: -1 }).limit(10);

    console.log(`=== LOAD SHEETS IN DATABASE ===\n`);
    console.log(`Total Load Sheets: ${loadSheets.length}\n`);

    if (loadSheets.length === 0) {
      console.log("❌ No load sheets found in database");
      console.log("\nThe placeholder endpoint returns a mock ID but doesn't actually");
      console.log("save to the database. The 'Create Load Sheet' functionality");
      console.log("needs proper implementation.\n");
    } else {
      loadSheets.forEach((sheet, idx) => {
        console.log(`${idx + 1}. Load Sheet ID: ${sheet._id}`);
        console.log(`   Number: ${sheet.load_sheet_number || "N/A"}`);
        console.log(`   Status: ${sheet.status || "N/A"}`);
        console.log(`   Depot: ${sheet.depot_id || "N/A"}`);
        console.log(`   Created: ${sheet.created_at || "N/A"}`);
        console.log("");
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkLoadSheets();
