/**
 * PRODUCTION - Check why Dhaka Central Depot requisitions aren't showing
 * Run on VPS: node diagnose-requisition-visibility.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function diagnoseRequisitions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find Dhaka Central Depot
    const dhakaCentral = await db.collection("facilities").findOne({
      name: /Dhaka Central/i,
    });

    console.log("=== DHAKA CENTRAL DEPOT ===");
    console.log(`ID: ${dhakaCentral._id}`);
    console.log(`Name: ${dhakaCentral.name}\n`);

    // Find all requisitions from this depot
    const allReqs = await db
      .collection("inventory_requisitions")
      .find({ from_depot_id: dhakaCentral._id })
      .sort({ requisition_date: -1 })
      .toArray();

    console.log(`=== ALL REQUISITIONS FROM DHAKA CENTRAL (${allReqs.length}) ===\n`);

    for (const req of allReqs) {
      console.log(`Requisition: ${req.requisition_no || req._id}`);
      console.log(`  Status: ${req.status || "N/A"}`);
      console.log(`  Scheduling Status: ${req.scheduling_status || "N/A"}`);
      console.log(`  Requisition Date: ${req.requisition_date}`);
      console.log(`  Items: ${req.details?.length || 0}`);

      if (req.details && req.details.length > 0) {
        req.details.forEach((d, idx) => {
          console.log(`    ${idx + 1}. Qty: ${d.qty}, Unscheduled: ${d.unscheduled_qty || "N/A"}`);
        });
      }
      console.log();
    }

    // Check what the API query is looking for
    console.log("=== API QUERY CRITERIA ===");
    console.log("Looking for requisitions with:");
    console.log("  status: 'submitted'");
    console.log("  scheduling_status: { $in: ['not-scheduled', 'partially-scheduled'] }\n");

    // Find requisitions matching API query
    const matchingReqs = await db
      .collection("inventory_requisitions")
      .find({
        from_depot_id: dhakaCentral._id,
        status: "submitted",
        scheduling_status: { $in: ["not-scheduled", "partially-scheduled"] },
      })
      .toArray();

    console.log(`=== REQUISITIONS MATCHING API QUERY (${matchingReqs.length}) ===`);
    if (matchingReqs.length === 0) {
      console.log("  ❌ NONE - This is why they don't appear!\n");

      console.log("=== PROBLEM DIAGNOSIS ===");
      const submittedReqs = allReqs.filter((r) => r.status === "submitted");
      console.log(`Submitted requisitions: ${submittedReqs.length}`);

      if (submittedReqs.length > 0) {
        console.log("\nSubmitted but with wrong scheduling_status:");
        submittedReqs.forEach((r) => {
          console.log(
            `  - ${r.requisition_no}: scheduling_status = "${r.scheduling_status || "MISSING"}"`
          );
        });
      }

      const notSubmitted = allReqs.filter((r) => r.status !== "submitted");
      if (notSubmitted.length > 0) {
        console.log(`\nNot submitted (status != 'submitted'): ${notSubmitted.length}`);
        notSubmitted.forEach((r) => {
          console.log(`  - ${r.requisition_no}: status = "${r.status}"`);
        });
      }
    } else {
      matchingReqs.forEach((r) => {
        console.log(`  ✓ ${r.requisition_no}`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

diagnoseRequisitions();
