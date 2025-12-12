/**
 * PRODUCTION - Check and fix requisitions in inventory_manufactured_requisitions
 * Run on VPS: node fix-requisition-scheduling-status.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function fixRequisitions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Check the actual collection
    console.log("=== CHECKING inventory_manufactured_requisitions ===\n");

    const allReqs = await db
      .collection("inventory_manufactured_requisitions")
      .find()
      .sort({ requisition_date: -1 })
      .limit(5)
      .toArray();

    console.log(
      `Total requisitions in collection: ${await db.collection("inventory_manufactured_requisitions").countDocuments()}\n`
    );

    console.log("=== SAMPLE REQUISITIONS ===\n");
    for (const req of allReqs) {
      console.log(`Requisition: ${req.requisition_no || req._id}`);
      console.log(`  Status: ${req.status || "MISSING"}`);
      console.log(`  Scheduling Status: ${req.scheduling_status || "MISSING"}`);
      console.log(`  From Depot ID: ${req.from_depot_id || "MISSING"}`);

      if (req.from_depot_id) {
        const depot = await db.collection("facilities").findOne({ _id: req.from_depot_id });
        console.log(`  From Depot: ${depot?.name || "NOT FOUND"}`);
      }
      console.log();
    }

    // Find submitted requisitions without scheduling_status
    const needsFixing = await db
      .collection("inventory_manufactured_requisitions")
      .find({
        status: "submitted",
        $or: [
          { scheduling_status: { $exists: false } },
          { scheduling_status: null },
          { scheduling_status: "" },
        ],
      })
      .toArray();

    console.log(`\n=== REQUISITIONS NEEDING FIX (${needsFixing.length}) ===\n`);

    if (needsFixing.length === 0) {
      console.log("  ✅ All submitted requisitions have scheduling_status\n");

      // Check if any match the API query
      const matching = await db
        .collection("inventory_manufactured_requisitions")
        .find({
          status: "submitted",
          scheduling_status: { $in: ["not-scheduled", "partially-scheduled"] },
        })
        .toArray();

      console.log(`Requisitions matching API query: ${matching.length}`);
      matching.forEach((r) => {
        console.log(`  - ${r.requisition_no}: ${r.scheduling_status}`);
      });
    } else {
      console.log("Fixing requisitions...\n");

      for (const req of needsFixing) {
        // Set scheduling_status to "not-scheduled" and unscheduled_qty for each detail
        const updates = {
          scheduling_status: "not-scheduled",
        };

        // Update detail items to have unscheduled_qty
        if (req.details && req.details.length > 0) {
          const updatedDetails = req.details.map((detail) => ({
            ...detail,
            unscheduled_qty: detail.unscheduled_qty || detail.qty,
          }));
          updates.details = updatedDetails;
        }

        await db
          .collection("inventory_manufactured_requisitions")
          .updateOne({ _id: req._id }, { $set: updates });

        console.log(`  ✅ Fixed: ${req.requisition_no}`);
      }

      console.log(`\n✅ Fixed ${needsFixing.length} requisitions!`);
      console.log("   They should now appear in Distribution's Schedule Requisitions page\n");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixRequisitions();
