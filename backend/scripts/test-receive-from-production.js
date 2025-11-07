/**
 * Test receive from production API endpoint
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function testReceive() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // 1. Find shabnamdpo user
    const user = await db.collection("users").findOne({ username: "shabnamdpo" });
    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("👤 User:", user.username);
    console.log("   Employee ID:", user.employee_id);

    // 2. Get employee details
    const employee = await db.collection("employees").findOne({ _id: user.employee_id });
    if (!employee) {
      console.log("❌ Employee not found");
      return;
    }

    console.log("\n👔 Employee:", employee.name);
    console.log("   Employee Type:", employee.employee_type);
    console.log("   Facility ID:", employee.facility_id);
    console.log("   Factory Store ID:", employee.factory_store_id || "N/A");

    // 3. Find a pending shipment for this depot
    const shipments = await db
      .collection("production_send_to_stores")
      .find({
        facility_store_id: employee.facility_id,
        status: "sent",
      })
      .limit(1)
      .toArray();

    if (shipments.length === 0) {
      console.log("\n⚠️  No pending shipments found for this depot");
      console.log("   Looking for shipments with facility_store_id:", employee.facility_id);

      // Check what shipments exist
      const allShipments = await db
        .collection("production_send_to_stores")
        .find({ status: "sent" })
        .limit(5)
        .toArray();

      console.log(`\n📦 Found ${allShipments.length} 'sent' shipments total:`);
      allShipments.forEach((s) => {
        console.log(`   - ${s.ref} → Depot: ${s.facility_store_id}`);
      });

      return;
    }

    const shipment = shipments[0];
    console.log("\n📦 Found pending shipment:");
    console.log("   Ref:", shipment.ref);
    console.log("   Status:", shipment.status);
    console.log("   Facility Store ID:", shipment.facility_store_id);
    console.log("   Created:", shipment.created_at);
    console.log("   Products:", shipment.details?.length || 0);

    // 4. Check if depot matches
    if (shipment.facility_store_id.toString() !== employee.facility_id.toString()) {
      console.log("\n❌ Depot mismatch!");
      console.log("   Shipment is for depot:", shipment.facility_store_id);
      console.log("   User works at depot:", employee.facility_id);
      return;
    }

    console.log("\n✅ User can receive this shipment");
    console.log("\nTo test the actual API:");
    console.log("1. Login with shabnamdpo");
    console.log("2. Go to Inventory > Receive from Production");
    console.log(`3. Receive shipment ${shipment.ref}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testReceive();
