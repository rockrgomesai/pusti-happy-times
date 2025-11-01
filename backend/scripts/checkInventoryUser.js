/**
 * Check Inventory User Employee Record
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const Employee = require("../src/models/Employee");
const Facility = require("../src/models/Facility");

async function checkInventoryUser() {
  try {
    console.log("🔌 Connecting to MongoDB...");

    // Use the same connection string from .env
    const mongoURI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    const username = "inventorymanagerruby";
    console.log(`\n🔍 Looking up user: ${username}`);

    const user = await User.findOne({ username }).populate("role_id").populate("employee_id");

    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("\n👤 User Details:");
    console.log("  ID:", user._id);
    console.log("  Username:", user.username);
    console.log("  Active:", user.active);
    console.log("  Role ID:", user.role_id?._id);
    console.log("  Role Name:", user.role_id?.role);

    if (user.employee_id) {
      console.log("\n👔 Employee Details:");
      console.log("  Employee ID:", user.employee_id._id);
      console.log("  Employee Code:", user.employee_id.employee_code);
      console.log("  Employee Type:", user.employee_id.employee_type);
      console.log("  Facility ID:", user.employee_id.facility_id);
      console.log("  Factory Store ID:", user.employee_id.factory_store_id);
      console.log("  Depot ID:", user.employee_id.depot_id);
      console.log("  Active:", user.employee_id.active);

      // Check what field contains the depot reference
      const employee = await Employee.findById(user.employee_id._id)
        .populate("facility_id", "name type")
        .populate("factory_store_id", "name type")
        .populate("depot_id", "name type");

      console.log("\n🏭 Populated References:");
      if (employee.facility_id) {
        console.log("  Facility:", employee.facility_id.name, `(${employee.facility_id.type})`);
      }
      if (employee.factory_store_id) {
        console.log(
          "  Factory Store:",
          employee.factory_store_id.name,
          `(${employee.factory_store_id.type})`
        );
      }
      if (employee.depot_id) {
        console.log("  Depot:", employee.depot_id.name, `(${employee.depot_id.type})`);
      }
    } else {
      console.log("\n❌ No employee record found");
    }

    console.log("\n✅ Check complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkInventoryUser();
