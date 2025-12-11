/**
 * Check user 103's employee and facility assignment
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkUser103() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find user 103 - try by username
    let user = await db.collection("users").findOne({ username: "103" });
    
    if (!user) {
      console.log("❌ User 103 not found by ID or username!");
      console.log("Let me search for users with Inventory Depot role...\n");
      
      // Find Inventory Depot role
      const role = await db.collection("roles").findOne({ role: "Inventory Depot" });
      if (role) {
        console.log(`Inventory Depot Role ID: ${role._id}\n`);
        const inventoryUsers = await db.collection("users")
          .find({ role_id: role._id })
          .project({ _id: 1, username: 1, email: 1 })
          .limit(10)
          .toArray();
        
        console.log("Users with Inventory Depot role:");
        inventoryUsers.forEach((u, idx) => {
          console.log(`  ${idx + 1}. Username: ${u.username}, ID: ${u._id}`);
        });
      }
      process.exit(1);
    }

    console.log("=== USER 103 ===");
    console.log(`ID: ${user._id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Role ID: ${user.role_id}`);
    console.log(`Employee ID: ${user.employee_id || "NOT SET"}\n`);

    if (!user.employee_id) {
      console.log("❌ User has no employee_id assigned!");
      console.log("   This is why Depot Deliveries shows empty.\n");
      
      // Show available depots
      const depots = await db.collection("facilities")
        .find({ type: "Depot" })
        .project({ name: 1, type: 1 })
        .toArray();
      
      console.log("📋 Available Depots:");
      depots.forEach((d, idx) => {
        console.log(`  ${idx + 1}. ${d.name} (${d._id})`);
      });
      
      process.exit(1);
    }

    // Get employee record
    const employee = await db.collection("employees").findOne({ _id: user.employee_id });
    
    if (!employee) {
      console.log("❌ Employee record not found!");
      process.exit(1);
    }

    console.log("=== EMPLOYEE RECORD ===");
    console.log(`ID: ${employee._id}`);
    console.log(`Name: ${employee.name || "N/A"}`);
    console.log(`Employee Type: ${employee.employee_type || "N/A"}`);
    console.log(`Facility ID: ${employee.facility_id || "NOT SET"}`);
    console.log(`Factory Store ID: ${employee.factory_store_id || "NOT SET"}\n`);

    if (!employee.facility_id) {
      console.log("❌ Employee has no facility_id assigned!");
      console.log("   This is why Depot Deliveries API returns 400 error.\n");
      
      // Show available depots
      const depots = await db.collection("facilities")
        .find({ type: "Depot" })
        .project({ name: 1, type: 1 })
        .toArray();
      
      console.log("📋 Available Depots:");
      depots.forEach((d, idx) => {
        console.log(`  ${idx + 1}. ${d.name} (${d._id})`);
      });
      
      console.log("\n💡 To fix, assign a depot to this employee:");
      console.log(`   db.employees.updateOne(`);
      console.log(`     { _id: ObjectId("${employee._id}") },`);
      console.log(`     { $set: { facility_id: ObjectId("DEPOT_ID_HERE") } }`);
      console.log(`   )`);
      
      process.exit(1);
    }

    // Get facility details
    const facility = await db.collection("facilities").findOne({ _id: employee.facility_id });
    
    console.log("=== ASSIGNED FACILITY ===");
    console.log(`ID: ${facility._id}`);
    console.log(`Name: ${facility.name}`);
    console.log(`Type: ${facility.type}\n`);

    if (facility.type !== "Depot") {
      console.log(`⚠️  Facility type is "${facility.type}", not "Depot"`);
      console.log("   User should be assigned to a Depot facility.\n");
    }

    // Check for approved schedulings for this depot
    const schedulingsCount = await db.collection("schedulings").countDocuments({
      depot_id: facility._id,
      current_status: "Approved"
    });

    console.log("=== DEPOT DELIVERIES DATA ===");
    console.log(`Approved schedulings for this depot: ${schedulingsCount}`);

    if (schedulingsCount === 0) {
      console.log("\n⚠️  No approved schedulings exist for this depot!");
      console.log("   That's why Depot Deliveries shows empty.\n");
      
      // Check if there are ANY schedulings for this depot
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
        
        console.log("\nSchedulings by status:");
        statuses.forEach((s) => {
          console.log(`  - ${s._id}: ${s.count}`);
        });
      }
    } else {
      console.log("✅ Data exists! User should see deliveries.\n");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUser103();
