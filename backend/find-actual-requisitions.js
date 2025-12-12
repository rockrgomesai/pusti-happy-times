/**
 * PRODUCTION - Find the actual requisitions visible in UI
 * Run on VPS: node find-actual-requisitions.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function findRequisitions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find the specific requisitions by number
    const reqNumbers = ["req-20251211-001", "req-20251209-001"];

    console.log("=== SEARCHING FOR SPECIFIC REQUISITIONS ===\n");

    for (const reqNo of reqNumbers) {
      const req = await db.collection("inventory_requisitions").findOne({
        requisition_no: reqNo,
      });

      if (!req) {
        console.log(`❌ ${reqNo} - NOT FOUND`);
        continue;
      }

      console.log(`=== ${reqNo} ===`);
      console.log(`ID: ${req._id}`);
      console.log(`Status: ${req.status}`);
      console.log(`Scheduling Status: ${req.scheduling_status || "MISSING"}`);
      console.log(`From Depot ID: ${req.from_depot_id || "MISSING"}`);
      console.log(`Requisition Date: ${req.requisition_date}`);
      console.log(`Created By: ${req.created_by}`);
      console.log(`Items: ${req.details?.length || 0}`);

      if (req.from_depot_id) {
        const depot = await db.collection("facilities").findOne({ _id: req.from_depot_id });
        console.log(`From Depot Name: ${depot?.name || "NOT FOUND"}`);
      }

      // Show all fields
      console.log("\nAll fields:");
      console.log(JSON.stringify(req, null, 2));
      console.log("\n" + "=".repeat(60) + "\n");
    }

    // Also search for ANY submitted requisitions
    console.log("=== ALL SUBMITTED REQUISITIONS ===\n");
    const allSubmitted = await db
      .collection("inventory_requisitions")
      .find({ status: "submitted" })
      .sort({ requisition_date: -1 })
      .limit(5)
      .toArray();

    console.log(`Found ${allSubmitted.length} submitted requisitions:\n`);
    for (const req of allSubmitted) {
      const depot = req.from_depot_id
        ? await db.collection("facilities").findOne({ _id: req.from_depot_id })
        : null;

      console.log(`${req.requisition_no || req._id}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Scheduling Status: ${req.scheduling_status || "MISSING"}`);
      console.log(`  From Depot: ${depot?.name || "N/A"}`);
      console.log(`  Date: ${req.requisition_date}`);
      console.log();
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

findRequisitions();
