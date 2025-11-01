/**
 * Check Production User Setup
 * Verifies that productionmanagerorange has all required fields
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkUser() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // Find the user
    const user = await db.collection("users").findOne({ username: "productionmanagerorange" });

    if (!user) {
      console.log("❌ User 'productionmanagerorange' not found");
      process.exit(1);
    }

    console.log("\n📋 User Details:");
    console.log("   Username:", user.username);
    console.log("   Email:", user.email);
    console.log("   User Type:", user.user_type);
    console.log("   Employee ID:", user.employee_id);

    // Get role
    const role = await db.collection("roles").findOne({ _id: user.role_id });
    console.log("\n🎭 Role:");
    console.log("   Role Name:", role?.role);

    // Get employee details
    if (user.employee_id) {
      const employee = await db.collection("employees").findOne({ _id: user.employee_id });

      if (employee) {
        console.log("\n👤 Employee Details:");
        console.log("   Name:", employee.name);
        console.log("   Employee Code:", employee.employee_id);
        console.log("   Employee Type:", employee.employee_type);
        console.log("   Facility ID:", employee.facility_id || "NOT SET ❌");
        console.log("   Factory Store ID:", employee.factory_store_id || "NOT SET ❌");

        // Get facility name
        if (employee.facility_id) {
          const facility = await db.collection("facilities").findOne({ _id: employee.facility_id });
          console.log("\n🏭 Facility:");
          console.log("   Name:", facility?.name);
          console.log("   Type:", facility?.facility_type);
        }

        // Get factory store name
        if (employee.factory_store_id) {
          const factoryStore = await db
            .collection("facilities")
            .findOne({ _id: employee.factory_store_id });
          console.log("\n🏪 Factory Store:");
          console.log("   Name:", factoryStore?.name);
          console.log("   Type:", factoryStore?.facility_type);
        }

        // Check if needs fixing
        console.log("\n🔍 Status:");
        if (!employee.facility_id) {
          console.log("   ❌ MISSING: facility_id (should be a Factory)");
        } else {
          console.log("   ✅ Has facility_id");
        }

        if (!employee.factory_store_id) {
          console.log("   ❌ MISSING: factory_store_id (should be a Depot)");
        } else {
          console.log("   ✅ Has factory_store_id");
        }

        if (employee.facility_id && employee.factory_store_id) {
          console.log("\n✅ User is properly configured!");
        } else {
          console.log("\n⚠️  User needs to be configured. Run fixProductionUser.js to fix.");
        }
      } else {
        console.log("\n❌ Employee record not found!");
      }
    } else {
      console.log("\n❌ User has no employee_id!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected");
    process.exit(0);
  }
}

checkUser();
