const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function debugChalanIssue() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const ObjectId = mongoose.Types.ObjectId;

    // Get user
    const user = await db.collection("users").findOne({ username: "inventorymanagerpapaya" });

    console.log("=== USER CONTEXT ===");
    console.log("Username:", user.username);
    console.log("Facility ID:", user.facility_id);
    console.log("Role ID:", user.role_id);

    // Check if facility_id is null or undefined
    if (!user.facility_id) {
      console.log("\n❌ ERROR: User has no facility_id!");
      console.log("This is why no chalans are returned - the query filters by depot_id");
      await mongoose.disconnect();
      return;
    }

    const depot_id = user.facility_id;

    // Test exact backend query
    console.log("\n=== TESTING BACKEND QUERY ===");
    console.log("Query filter: { depot_id:", depot_id, "}");

    // Using Mongoose model
    const DeliveryChalan = mongoose.model(
      "DeliveryChalan",
      new mongoose.Schema({}, { strict: false, collection: "deliverychalans" })
    );

    const chalans = await DeliveryChalan.find({ depot_id })
      .populate("distributor_id", "name address phone")
      .populate("transport_id", "transport")
      .populate("load_sheet_id", "load_sheet_number")
      .sort({ chalan_date: -1 })
      .limit(20)
      .lean();

    console.log("Chalans found:", chalans.length);

    if (chalans.length > 0) {
      console.log("\n=== CHALAN DATA ===");
      chalans.forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.chalan_no}`);
        console.log("   Distributor:", c.distributor_id);
        console.log("   Transport:", c.transport_id);
        console.log("   Load Sheet:", c.load_sheet_id);
        console.log("   Vehicle:", c.vehicle_no);
        console.log("   Status:", c.status);
        console.log("   Date:", c.chalan_date);
      });
    } else {
      console.log("\n❌ No chalans found with query");

      // Check if chalans exist at all
      const allChalans = await DeliveryChalan.find().lean();
      console.log("\nTotal chalans in database:", allChalans.length);

      if (allChalans.length > 0) {
        console.log("\nDepot IDs in database:");
        const depotIds = [...new Set(allChalans.map((c) => c.depot_id?.toString()))];
        depotIds.forEach((id) => {
          const count = allChalans.filter((c) => c.depot_id?.toString() === id).length;
          console.log(`  - ${id}: ${count} chalans`);
        });

        console.log("\nUser's depot_id:", user.facility_id.toString());
        console.log("Match found:", depotIds.includes(user.facility_id.toString()));
      }
    }

    // Test API permission
    console.log("\n=== CHECKING PERMISSIONS ===");
    const chalanReadPerm = await db.collection("apipermissions").findOne({ key: "chalan:read" });

    if (chalanReadPerm) {
      const hasPermission = await db.collection("roleapipermissions").findOne({
        role_id: user.role_id,
        api_permission_id: chalanReadPerm._id,
      });

      console.log("chalan:read permission exists:", !!chalanReadPerm);
      console.log("User role has permission:", !!hasPermission);
    } else {
      console.log("❌ chalan:read permission not found!");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugChalanIssue();
