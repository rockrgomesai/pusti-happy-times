const mongoose = require("mongoose");
const Scheduling = require("./src/models/Scheduling");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixSchedulingStatus() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Find schedulings with "Finance-to-approve" status that should be "Pending-scheduling"
    const result = await Scheduling.updateMany(
      {
        current_status: "Finance-to-approve",
      },
      {
        $set: { current_status: "Pending-scheduling" },
      }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} scheduling record(s)`);
    console.log(`   Changed status from "Finance-to-approve" to "Pending-scheduling"`);

    // Verify the update
    const updated = await Scheduling.find({ current_status: "Pending-scheduling" })
      .select("order_number current_status")
      .lean();

    console.log("\n📦 Records with Pending-scheduling status:");
    updated.forEach((s) => {
      console.log(`   - ${s.order_number}: ${s.current_status}`);
    });

    await mongoose.connection.close();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixSchedulingStatus();
