const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function assignFacility() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const ObjectId = mongoose.Types.ObjectId;

    // Find the user
    const user = await db.collection("users").findOne({ username: "inventorymanagerpapaya" });

    if (!user) {
      console.log("❌ User not found");
      await mongoose.disconnect();
      return;
    }

    console.log("User:", user.username);
    console.log("Current facility_id:", user.facility_id || "NONE");

    // Find Dhaka Central Depot (where the chalans are)
    const depot = await db
      .collection("facilities")
      .findOne({ _id: new ObjectId("68f2855dbdde87d90d1b9cf1") });

    if (!depot) {
      console.log("❌ Depot not found");
      await mongoose.disconnect();
      return;
    }

    console.log("\n=== ASSIGNING FACILITY ===");
    console.log("Facility:", depot.name);
    console.log("Facility ID:", depot._id);
    console.log("Type:", depot.type);

    // Update user with facility_id
    const result = await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { facility_id: depot._id } });

    if (result.modifiedCount > 0) {
      console.log("\n✅ Successfully assigned facility to user");
      console.log("User can now see chalans for:", depot.name);
    } else {
      console.log("\n⚠️ No changes made (facility might already be set)");
    }

    // Verify
    const updatedUser = await db.collection("users").findOne({ _id: user._id });
    console.log("\nVerification:");
    console.log("User facility_id:", updatedUser.facility_id);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

assignFacility();
