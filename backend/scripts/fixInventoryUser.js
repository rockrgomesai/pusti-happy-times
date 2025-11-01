/**
 * Fix Inventory User Depot Assignment
 * Move depot from facility_id to factory_store_id
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Employee = require("../src/models/Employee");
const Facility = require("../src/models/Facility");

async function fixInventoryUser() {
  try {
    console.log("🔌 Connecting to MongoDB...");

    const mongoURI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB\n");

    const username = "inventorymanagerruby";
    console.log(`🔍 Looking up user: ${username}`);

    const user = await User.findOne({ username }).populate("employee_id");

    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    if (!user.employee_id) {
      console.log("❌ No employee record found");
      process.exit(1);
    }

    const employee = user.employee_id;
    console.log("\n👔 Current Employee Details:");
    console.log("  Employee ID:", employee._id);
    console.log("  Employee Type:", employee.employee_type);
    console.log("  Facility ID:", employee.facility_id);
    console.log("  Factory Store ID:", employee.factory_store_id);

    // Check what facility_id references
    if (employee.facility_id) {
      const facility = await Facility.findById(employee.facility_id);
      console.log("\n🏭 Current Facility:");
      console.log("  Name:", facility.name);
      console.log("  Type:", facility.type);

      // If facility_id is a Depot, it should be in factory_store_id instead
      if (facility.type === "Depot") {
        console.log("\n⚠️ Found issue: Depot is in facility_id instead of factory_store_id");
        console.log("🔧 Fixing...");

        // For Inventory role with Depot, we need to find the parent Factory
        // Set factory_store_id to the Depot
        // Set facility_id to the parent Factory

        // First, look for parent_id in the depot
        let parentFactory = null;

        if (facility.parent_id) {
          parentFactory = await Facility.findById(facility.parent_id);
          if (parentFactory && parentFactory.type === "Factory") {
            console.log("  ✓ Found parent Factory via parent_id:", parentFactory.name);
          } else {
            parentFactory = null;
          }
        }

        // If no parent_id or parent is not a Factory, search all factories
        if (!parentFactory) {
          console.log("  🔍 Searching for parent Factory...");
          const allFactories = await Facility.find({ type: "Factory" });

          // Check if Shabnam Depot's name contains factory reference
          // Or if there's a factory that has this depot as child
          for (const factory of allFactories) {
            const childDepots = await Facility.find({
              parent_id: factory._id,
              type: "Depot",
            });

            if (childDepots.some((d) => d._id.toString() === facility._id.toString())) {
              parentFactory = factory;
              console.log("  ✓ Found parent Factory via children search:", factory.name);
              break;
            }
          }

          // If still not found, just use the first Factory
          if (!parentFactory && allFactories.length > 0) {
            parentFactory = allFactories[0];
            console.log("  ⚠️ No direct parent found, using first Factory:", parentFactory.name);
          }
        }

        if (!parentFactory) {
          console.log("  ❌ No Factory found! Cannot complete fix.");
          console.log("  📝 Please manually create or assign a Factory for this Depot.");
          process.exit(1);
        }

        // Update employee record
        employee.facility_id = parentFactory._id;
        employee.factory_store_id = facility._id;

        console.log("  ✓ Set facility_id to Factory:", parentFactory.name);
        console.log("  ✓ Set factory_store_id to Depot:", facility.name);

        await employee.save();
        console.log("\n✅ Employee record updated successfully!");

        // Verify the fix
        const updatedEmployee = await Employee.findById(employee._id)
          .populate("facility_id", "name type")
          .populate("factory_store_id", "name type");

        console.log("\n✅ Updated Employee Details:");
        if (updatedEmployee.facility_id) {
          console.log(
            "  Facility:",
            updatedEmployee.facility_id.name,
            `(${updatedEmployee.facility_id.type})`
          );
        } else {
          console.log("  Facility: null");
        }
        console.log(
          "  Factory Store (Depot):",
          updatedEmployee.factory_store_id.name,
          `(${updatedEmployee.factory_store_id.type})`
        );
      } else {
        console.log("\n✅ Configuration is correct - facility is a Factory");
      }
    } else {
      console.log("\n❌ No facility_id set");
    }

    console.log("\n✅ Check complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixInventoryUser();
