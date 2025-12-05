const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    console.log("Connected to MongoDB");

    const LoadSheet = mongoose.model(
      "LoadSheet",
      new mongoose.Schema({}, { strict: false, collection: "load_sheets" })
    );

    const loadSheets = await LoadSheet.find({}).sort({ created_at: -1 }).limit(5);

    console.log(`\nTotal Load Sheets: ${loadSheets.length}`);

    if (loadSheets.length > 0) {
      console.log("\n✅ Load Sheets found:");
      loadSheets.forEach((ls, index) => {
        console.log(`\n${index + 1}. Load Sheet: ${ls.load_sheet_number}`);
        console.log(`   Status: ${ls.status}`);
        console.log(`   Depot: ${ls.depot_id}`);
        console.log(`   Distributors: ${ls.distributors?.length || 0}`);
        console.log(`   Created: ${ls.created_at}`);
        console.log(`   Created By: ${ls.created_by}`);
      });
    } else {
      console.log("\n❌ No load sheets found in database");
    }

    await mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
