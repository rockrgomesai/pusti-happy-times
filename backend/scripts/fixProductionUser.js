/**
 * Fix Production User
 * Assigns factory_store_id to productionmanagerorange
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find the user
    const user = await db.collection("users").findOne({ username: "productionmanagerorange" });

    if (!user || !user.employee_id) {
      console.log("❌ User or employee not found");
      process.exit(1);
    }

    // Get employee
    const employee = await db.collection("employees").findOne({ _id: user.employee_id });

    if (!employee) {
      console.log("❌ Employee record not found");
      process.exit(1);
    }

    console.log("\n👤 Current Employee:");
    console.log("   Name:", employee.name);
    console.log("   Facility ID:", employee.facility_id);
    console.log("   Factory Store ID:", employee.factory_store_id || "NOT SET");

    // Find a Depot to assign as factory_store_id
    const depot = await db.collection("facilities").findOne({ type: "Depot" });

    if (!depot) {
      console.log("❌ No Depot found in database");
      process.exit(1);
    }

    console.log("\n🏪 Assigning Depot:");
    console.log("   Name:", depot.name);
    console.log("   ID:", depot._id);

    // Update employee with factory_store_id
    await db.collection("employees").updateOne(
      { _id: employee._id },
      {
        $set: {
          factory_store_id: depot._id,
          updated_at: new Date(),
        },
      }
    );

    console.log("\n✅ Updated employee with factory_store_id");

    // Verify the update
    const updatedEmployee = await db.collection("employees").findOne({ _id: employee._id });
    console.log("\n📋 Updated Employee:");
    console.log("   Facility ID:", updatedEmployee.facility_id);
    console.log("   Factory Store ID:", updatedEmployee.factory_store_id);

    console.log("\n✅ ===== FIX COMPLETE =====");
    console.log(
      "\n⚠️  IMPORTANT: User must log out and log back in to get updated JWT token with factory_store_id!"
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

fixUser();
