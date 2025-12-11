/**
 * Fix user 103 - assign facility/depot
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

async function fixUser103Facility() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
    const Employee = mongoose.model("Employee", new mongoose.Schema({}, { strict: false }), "employees");
    const Facility = mongoose.model("Facility", new mongoose.Schema({}, { strict: false }), "facilities");

    // Find user 103
    const user = await User.findOne({ username: "103" });
    
    if (!user) {
      console.log("❌ User 103 not found");
      process.exit(1);
    }

    console.log("=== USER 103 INFO ===");
    console.log(`Username: ${user.username}`);
    console.log(`Employee ID: ${user.employee_id || "NOT SET"}\n`);

    // Check if user has employee record
    if (!user.employee_id) {
      console.log("❌ User 103 has no employee_id assigned!");
      console.log("\n📋 Available Facilities (Depots):");
      
      const facilities = await Facility.find({ type: "Depot" }).select("name type").lean();
      facilities.forEach((f, idx) => {
        console.log(`  ${idx + 1}. ${f.name} (${f._id})`);
      });

      console.log("\n⚠️  Please manually assign user 103 to a facility/depot");
      console.log("   Or create an employee record for them");
      process.exit(1);
    }

    // Check employee record
    const employee = await Employee.findById(user.employee_id).populate("facility_id").lean();
    
    if (!employee) {
      console.log("❌ Employee record not found!");
      process.exit(1);
    }

    console.log("=== EMPLOYEE INFO ===");
    console.log(`Employee ID: ${employee._id}`);
    console.log(`Facility ID: ${employee.facility_id?._id || "NOT SET"}`);
    console.log(`Facility Name: ${employee.facility_id?.name || "N/A"}`);
    console.log(`Facility Type: ${employee.facility_id?.type || "N/A"}\n`);

    if (!employee.facility_id) {
      console.log("❌ Employee has no facility assigned!");
      console.log("\n📋 Available Facilities (Depots):");
      
      const facilities = await Facility.find({ type: "Depot" }).select("name type").lean();
      facilities.forEach((f, idx) => {
        console.log(`  ${idx + 1}. ${f.name} (${f._id})`);
      });

      console.log("\n⚠️  To fix, update employee record with facility_id");
      console.log(`   db.employees.updateOne({_id: ObjectId("${employee._id}")}, {$set: {facility_id: ObjectId("FACILITY_ID_HERE")}})`);
      process.exit(1);
    }

    console.log("✅ User 103 is properly configured!");
    console.log(`   Assigned to: ${employee.facility_id.name}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixUser103Facility();
