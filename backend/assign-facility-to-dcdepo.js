/**
 * Assign facility to dcdepo user
 */

const mongoose = require("mongoose");
const User = require("./src/models/User");
const Facility = require("./src/models/Facility");

const MONGODB_URI =
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function assignFacility() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find dcdepo user
    const dcdepo = await User.findOne({ username: "dcdepo" });
    if (!dcdepo) {
      console.log("❌ dcdepo user not found");
      process.exit(1);
    }
    console.log("✅ Found dcdepo user:", dcdepo._id);

    // Find a depot facility (type: 'Depot' - capital D)
    const depot = await Facility.findOne({ type: "Depot", active: true });
    if (!depot) {
      console.log("❌ No active Depot facility found");

      // List all facilities
      const allFacilities = await Facility.find();
      console.log("\n📋 Available facilities:");
      allFacilities.forEach((f) => {
        console.log(`   - ${f.name} (${f.type}) - ID: ${f._id}`);
      });

      process.exit(1);
    } else {
      console.log("✅ Found depot:", depot._id, "-", depot.name);
      dcdepo.facility_id = depot._id;
    }

    await dcdepo.save();
    console.log("✅ Assigned facility to dcdepo user");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

assignFacility();
