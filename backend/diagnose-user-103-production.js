/**
 * PRODUCTION DIAGNOSTIC - Check user 103's depot assignment
 * Run this on VPS: node diagnose-user-103-production.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkUser103() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to PRODUCTION MongoDB\n");

    const db = mongoose.connection.db;

    // Find user 103
    const user = await db.collection("users").findOne({ username: "103" });
    
    if (!user) {
      console.log("❌ User 103 not found!");
      process.exit(1);
    }

    console.log("=== USER 103 ===");
    console.log(`ID: ${user._id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Role ID: ${user.role_id}`);
    console.log(`Employee ID: ${user.employee_id || "❌ NOT SET"}\n`);

    if (!user.employee_id) {
      console.log("❌ PROBLEM FOUND: User has no employee_id assigned!");
      console.log("   The API requires: user.employee_id.facility_id to determine depot\n");
      
      const depots = await db.collection("facilities")
        .find({ type: "Depot" })
        .project({ name: 1, type: 1 })
        .toArray();
      
      console.log("📋 Available Depots:");
      depots.forEach((d, idx) => {
        console.log(`  ${idx + 1}. ${d.name} (${d._id})`);
      });
      
      console.log("\n💡 SOLUTION:");
      console.log("   1. Create an employee record for user 103");
      console.log("   2. Assign a depot facility_id to that employee");
      console.log("   3. Link employee to user via user.employee_id\n");
      
      process.exit(1);
    }

    // Get employee record
    const employee = await db.collection("employees").findOne({ _id: user.employee_id });
    
    if (!employee) {
      console.log("❌ PROBLEM: Employee record not found!");
      console.log(`   User has employee_id: ${user.employee_id} but record doesn't exist\n`);
      process.exit(1);
    }

    console.log("=== EMPLOYEE RECORD ===");
    console.log(`ID: ${employee._id}`);
    console.log(`Name: ${employee.name || "N/A"}`);
    console.log(`Employee Type: ${employee.employee_type || "N/A"}`);
    console.log(`Facility ID: ${employee.facility_id || "❌ NOT SET"}`);
    console.log(`Factory Store ID: ${employee.factory_store_id || "N/A"}\n`);

    if (!employee.facility_id) {
      console.log("❌ PROBLEM FOUND: Employee has no facility_id assigned!");
      console.log("   The API requires: user.employee_id.facility_id\n");
      
      const depots = await db.collection("facilities")
        .find({ type: "Depot" })
        .project({ name: 1, type: 1 })
        .toArray();
      
      console.log("📋 Available Depots:");
      depots.forEach((d, idx) => {
        console.log(`  ${idx + 1}. ${d.name} (${d._id})`);
      });
      
      console.log("\n💡 FIX COMMAND:");
      console.log(`   mongo "mongodb://..." --eval '`);
      console.log(`     db.employees.updateOne(`);
      console.log(`       { _id: ObjectId("${employee._id}") },`);
      console.log(`       { $set: { facility_id: ObjectId("DEPOT_ID_FROM_ABOVE") } }`);
      console.log(`     )`);
      console.log(`   '\n`);
      
      process.exit(1);
    }

    // Get facility details
    const facility = await db.collection("facilities").findOne({ _id: employee.facility_id });
    
    if (!facility) {
      console.log("❌ PROBLEM: Facility not found!");
      console.log(`   Employee has facility_id: ${employee.facility_id} but record doesn't exist\n`);
      process.exit(1);
    }

    console.log("=== ASSIGNED FACILITY ===");
    console.log(`ID: ${facility._id}`);
    console.log(`Name: ${facility.name}`);
    console.log(`Type: ${facility.type}\n`);

    if (facility.type !== "Depot") {
      console.log(`⚠️  WARNING: Facility type is "${facility.type}", not "Depot"`);
      console.log("   User should be assigned to a Depot facility for depot-deliveries.\n");
    }

    // Check for approved schedulings
    const schedulingsCount = await db.collection("schedulings").countDocuments({
      depot_id: facility._id,
      current_status: "Approved"
    });

    console.log("=== DATA CHECK ===");
    console.log(`Approved schedulings for this depot: ${schedulingsCount}`);

    if (schedulingsCount === 0) {
      console.log("\n⚠️  NO DATA: No approved schedulings exist for this depot!");
      console.log("   That's why Depot Deliveries shows 'No deliveries pending'\n");
      
      const anySchedulings = await db.collection("schedulings").countDocuments({
        depot_id: facility._id
      });
      
      console.log(`Total schedulings (any status): ${anySchedulings}`);
      
      if (anySchedulings > 0) {
        const statuses = await db.collection("schedulings")
          .aggregate([
            { $match: { depot_id: facility._id } },
            { $group: { _id: "$current_status", count: { $sum: 1 } } }
          ])
          .toArray();
        
        console.log("\n📊 Schedulings by status:");
        statuses.forEach((s) => {
          console.log(`  - ${s._id}: ${s.count}`);
        });
        
        console.log("\n💡 To see data in Depot Deliveries:");
        console.log("   Schedulings need current_status: 'Approved' (Finance approved)");
      } else {
        console.log("\n💡 No schedulings exist for this depot at all.");
        console.log("   Distribution module needs to create schedulings for this depot.");
      }
    } else {
      console.log("✅ DATA EXISTS! User should see deliveries.");
      console.log("\n🔍 If user still sees empty, check:");
      console.log("   1. User has depot-deliveries:read permission");
      console.log("   2. User logged out and back in after permission changes");
      console.log("   3. Browser console for API errors (F12)");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUser103();
