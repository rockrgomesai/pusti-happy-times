/**
 * PRODUCTION - Search all collections for requisitions
 * Run on VPS: node search-all-requisition-collections.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function searchAllCollections() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    
    console.log("=== SEARCHING ALL COLLECTIONS FOR REQUISITIONS ===\n");
    
    const requisitionCollections = collections.filter(c => 
      c.name.toLowerCase().includes("requisition") ||
      c.name.toLowerCase().includes("req")
    );

    console.log("Collections with 'requisition' or 'req' in name:");
    requisitionCollections.forEach(c => console.log(`  - ${c.name}`));
    console.log();

    // Check each collection
    for (const coll of requisitionCollections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`\n=== ${coll.name} (${count} documents) ===`);
      
      if (count > 0) {
        const sample = await db.collection(coll.name)
          .find()
          .limit(3)
          .toArray();
        
        sample.forEach((doc, idx) => {
          console.log(`\nDocument ${idx + 1}:`);
          console.log(`  ID: ${doc._id}`);
          console.log(`  Requisition No: ${doc.requisition_no || doc.req_no || "N/A"}`);
          console.log(`  Status: ${doc.status || "N/A"}`);
          console.log(`  From Depot: ${doc.from_depot_id || doc.depot_id || "N/A"}`);
          
          // Show field names
          const fields = Object.keys(doc).filter(k => k !== '__v');
          console.log(`  Fields: ${fields.join(", ")}`);
        });
      }
    }

    // Also check the exact requisition numbers from UI
    console.log("\n\n=== SEARCHING FOR SPECIFIC REQUISITION NUMBERS ===\n");
    const reqNumbers = ["req-20251211-001", "req-20251209-001"];

    for (const coll of collections) {
      for (const reqNo of reqNumbers) {
        const doc = await db.collection(coll.name).findOne({
          $or: [
            { requisition_no: reqNo },
            { req_no: reqNo },
            { number: reqNo },
            { code: reqNo }
          ]
        });

        if (doc) {
          console.log(`✅ FOUND ${reqNo} in collection: ${coll.name}`);
          console.log(JSON.stringify(doc, null, 2));
          console.log("\n" + "=".repeat(60) + "\n");
        }
      }
    }

    // Check what the requisition list API endpoint uses
    console.log("\n=== CHECKING REQUISITION LIST DATA ===");
    console.log("Looking at what user 3301053 created...\n");

    const userReqs = await db.collection("inventory_requisitions")
      .find({ created_by: new mongoose.Types.ObjectId("3301053") })
      .toArray();

    console.log(`User 3301053 requisitions: ${userReqs.length}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

searchAllCollections();
