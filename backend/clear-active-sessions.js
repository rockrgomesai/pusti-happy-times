const mongoose = require("mongoose");
require("dotenv").config();

const TrackingSession = require("./models/TrackingSession");

async function clearActiveSessions() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ Connected to MongoDB");

    const result = await TrackingSession.updateMany(
      { status: "active" },
      { $set: { status: "completed" } }
    );

    console.log(`✅ Updated ${result.modifiedCount} active sessions to completed`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

clearActiveSessions();
