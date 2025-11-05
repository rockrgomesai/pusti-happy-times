require("dotenv").config();
const mongoose = require("mongoose");

async function fixPapayaFacility() {
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
    const employee = await Employee.findById(user.employee_id);

    console.log("Current employee data:");
    console.log("  facility_id:", employee.facility_id);
    console.log("  factory_store_id:", employee.factory_store_id || "NOT SET");

    // Get the facility details
    const facility = await Facility.findById(employee.facility_id);
    console.log("\nFacility details:");
    console.log("  Name:", facility.name);
    console.log("  ID:", facility._id);

    // For Inventory Depot users, factory_store_id should be the facility's name or ID
    // Based on the pattern from inventorymanageruby, it should be the facility name
    console.log("\n🔧 Setting factory_store_id to facility name...");

    employee.factory_store_id = facility.name;
    await employee.save();

    console.log("✅ Updated employee record:");
    console.log("  factory_store_id:", employee.factory_store_id);

    console.log("\n⚠️  User needs to log out and log back in for changes to take effect!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

fixPapayaFacility();
