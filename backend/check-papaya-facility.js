require("dotenv").config();
const mongoose = require("mongoose");

async function checkEmployeeFacility() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
    const Employee = mongoose.model(
      "Employee",
      new mongoose.Schema({}, { strict: false }),
      "employees"
    );
    const Facility = mongoose.model(
      "Facility",
      new mongoose.Schema({}, { strict: false }),
      "facilities"
    );

    // Get user
    const user = await User.findOne({ username: "inventorymanagerpapaya" });
    if (!user) {
      console.log("❌ User not found!");
      return;
    }

    console.log("👤 User: inventorymanagerpapaya");
    console.log("   User ID:", user._id);
    console.log("   Employee ID:", user.employee_id);

    // Get employee
    const employee = await Employee.findById(user.employee_id);
    if (!employee) {
      console.log("❌ Employee record not found!");
      return;
    }

    console.log("\n👷 Employee:", employee.name);
    console.log("   Employee Type:", employee.employee_type);
    console.log("   facility_id:", employee.facility_id || "NOT SET");
    console.log("   factory_store_id:", employee.factory_store_id || "NOT SET");

    // Check facilities
    if (employee.facility_id) {
      const facility = await Facility.findById(employee.facility_id);
      if (facility) {
        console.log("\n🏢 Facility (facility_id):");
        console.log("   Name:", facility.name);
        console.log("   Code:", facility.code);
        console.log("   Type:", facility.facility_type);
      }
    }

    if (employee.factory_store_id) {
      console.log("\n📦 Factory Store ID:", employee.factory_store_id);
      console.log("   (This is a string, not an ObjectId reference)");
    }

    // Check what the auth context would have
    console.log("\n🔐 User Context (what API receives):");
    console.log("   facility_id:", employee.facility_id || "undefined");
    console.log("   factory_store_id:", employee.factory_store_id || "undefined");

    console.log("\n⚠️  Requisitions route expects: facility_store_id from req.userContext");
    console.log("   Current value:", employee.factory_store_id || employee.facility_id || "NONE");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkEmployeeFacility();
