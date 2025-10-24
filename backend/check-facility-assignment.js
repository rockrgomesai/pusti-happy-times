/**
 * Check if productionmanagerpapaya has facility_id set
 */

const mongoose = require("mongoose");
const { User, Employee } = require("./src/models");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkFacilityAssignment() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find the user
    const user = await User.findOne({ username: "productionmanagerpapaya" }).populate(
      "employee_id"
    );

    if (!user) {
      console.error("❌ User not found");
      return;
    }

    console.log("\n👤 User:", user.username);
    console.log("🆔 User ID:", user._id);
    console.log("📋 User type:", user.user_type);

    if (user.employee_id) {
      const employee = user.employee_id;
      console.log("\n👷 Employee:", employee.name);
      console.log("🆔 Employee ID:", employee._id);
      console.log("📋 Employee type:", employee.employee_type);
      console.log("🏭 Facility ID:", employee.facility_id);

      if (employee.facility_id) {
        const { Facility } = require("./src/models");
        const facility = await Facility.findById(employee.facility_id);
        if (facility) {
          console.log("🏭 Facility:", facility.name);
          console.log("🏭 Facility type:", facility.type);
        } else {
          console.warn("⚠️  Facility not found in database!");
        }
      } else {
        console.warn("⚠️  No facility_id assigned to this employee!");
      }
    } else {
      console.warn("⚠️  No employee_id linked to this user!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

checkFacilityAssignment();
