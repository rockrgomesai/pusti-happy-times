const mongoose = require("mongoose");
const Employee = require("./src/models/Employee");
const TrackingSession = require("./models/TrackingSession");

async function checkTracking() {
  try {
    await mongoose.connect(
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin"
    );
    console.log("✅ Connected to MongoDB\n");

    // Get all tracking sessions
    const sessions = await TrackingSession.find({})
      .populate("employee_id", "employee_id name")
      .sort({ created_at: -1 })
      .limit(10);

    console.log("=== ALL TRACKING SESSIONS (Most Recent First) ===\n");
    sessions.forEach((s, index) => {
      console.log(`${index + 1}. Session ID: ${s._id}`);
      console.log(
        `   Employee: ${s.employee_id ? s.employee_id.employee_id + " - " + s.employee_id.name : "N/A"}`
      );
      console.log(`   Date: ${s.date}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   Points: ${s.location_count || 0}`);
      console.log(
        `   Distance: ${s.total_distance_km ? s.total_distance_km.toFixed(2) + " km" : "0 km"}`
      );
      console.log(`   Started: ${s.start_time}`);
      console.log(`   Ended: ${s.end_time || "ACTIVE"}`);
      console.log("");
    });

    // Check specific employee
    const emp = await Employee.findOne({ employee_id: "0077" });
    if (emp) {
      console.log(`\n=== Sessions for employee "0077" (${emp.name}) ===`);
      const empSessions = await TrackingSession.find({ employee_id: emp._id }).sort({
        created_at: -1,
      });
      console.log(`Total sessions: ${empSessions.length}`);
      empSessions.forEach((s, i) => {
        console.log(
          `  ${i + 1}. ${s._id} - ${s.date} - ${s.status} - ${s.location_count || 0} points`
        );
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkTracking();
