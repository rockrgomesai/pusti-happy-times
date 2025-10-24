/**
 * Verify Facility Employees
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Facility = require("./src/models/Facility");
const Employee = require("./src/models/Employee");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function verify() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all facilities
    const facilities = await Facility.find({ active: true }).select("name type").lean();

    console.log("📦 Facilities:");
    facilities.forEach((f) => {
      console.log(`  - ${f.name} (${f.type})`);
    });

    // Get facility employees
    const employees = await Employee.find({
      employee_type: "facility",
      active: true,
    }).lean();

    console.log("\n👥 Facility Employees:");
    for (const e of employees) {
      const facility = facilities.find((f) => f._id.toString() === e.facility_id?.toString());
      console.log(`  - ${e.name}`);
      console.log(`    Facility: ${facility?.name} (${facility?.type})`);
      console.log("");
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Total Facilities: ${facilities.length}`);
    console.log(`  - Factories: ${facilities.filter((f) => f.type === "Factory").length}`);
    console.log(`  - Depots: ${facilities.filter((f) => f.type === "Depot").length}`);
    console.log(`  Total Facility Employees: ${employees.length}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

verify();
