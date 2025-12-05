const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function testChalanQuery() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const ObjectId = mongoose.Types.ObjectId;

    // Get user context
    const user = await db.collection("users").findOne({ username: "inventorymanagerpapaya" });
    console.log("=== USER CONTEXT ===");
    console.log("Username:", user.username);
    console.log("Facility ID:", user.facility_id);
    console.log("Role ID:", user.role_id);

    const depot_id = user.facility_id;

    // Test the exact query the backend uses
    console.log("\n=== TESTING BACKEND QUERY ===");
    console.log("Query:", JSON.stringify({ depot_id }, null, 2));

    const chalans = await db
      .collection("deliverychalans")
      .find({ depot_id })
      .sort({ chalan_date: -1 })
      .limit(20)
      .toArray();

    console.log("Chalans found:", chalans.length);

    if (chalans.length > 0) {
      console.log("\n=== CHALANS ===");
      chalans.forEach((c, i) => {
        console.log(`\n${i + 1}. Chalan ${c.chalan_no}`);
        console.log("   Depot ID:", c.depot_id);
        console.log("   Status:", c.status);
        console.log("   Date:", c.chalan_date);
        console.log("   Distributor ID:", c.distributor_id);
      });

      // Check if distributors exist
      console.log("\n=== CHECKING REFERENCES ===");
      const firstChalan = chalans[0];

      const distributor = await db
        .collection("distributors")
        .findOne({ _id: firstChalan.distributor_id });
      console.log("Distributor exists:", !!distributor);
      if (distributor) {
        console.log("  Name:", distributor.name);
      }

      const loadSheet = await db
        .collection("loadsheets")
        .findOne({ _id: firstChalan.load_sheet_id });
      console.log("LoadSheet exists:", !!loadSheet);
      if (loadSheet) {
        console.log("  Number:", loadSheet.load_sheet_number);
      }

      const transport = await db
        .collection("transports")
        .findOne({ _id: firstChalan.transport_id });
      console.log("Transport exists:", !!transport);
      if (transport) {
        console.log("  Name:", transport.transport);
      }
    } else {
      console.log("\n❌ No chalans found");

      // Debug: Show all chalans
      console.log("\n=== ALL CHALANS (for debugging) ===");
      const allChalans = await db.collection("deliverychalans").find().toArray();
      console.log("Total in database:", allChalans.length);
      allChalans.forEach((c) => {
        console.log(`  - ${c.chalan_no}: depot_id = ${c.depot_id}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testChalanQuery();
