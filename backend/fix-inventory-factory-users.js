/**
 * Fix Inventory Factory Users
 *
 * This script identifies and fixes all Inventory Factory users who are missing
 * proper factory and factory_store_id assignments.
 *
 * The issue: Inventory Factory users need BOTH:
 * - facility_id: pointing to a Factory
 * - factory_store_id: pointing to a Depot (the store within that factory)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const Employee = require("./src/models/Employee");
const Facility = require("./src/models/Facility");
const Role = require("./src/models/Role");

const MONGODB_URI = process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;

async function fixInventoryFactoryUsers() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all factories and depots
    const factories = await Facility.find({ type: "Factory", active: true }).lean();
    const depots = await Facility.find({ type: "Depot", active: true }).lean();

    console.log(`📦 Found ${factories.length} factories and ${depots.length} depots\n`);

    // Get all Inventory Factory users
    const users = await User.find({
      user_type: "employee",
      employee_id: { $ne: null },
    })
      .populate("employee_id")
      .populate("role_id", "role")
      .lean();

    const inventoryFactoryUsers = users.filter((u) => u.role_id?.role === "Inventory Factory");
    console.log(`👥 Total Inventory Factory users: ${inventoryFactoryUsers.length}\n`);

    // Identify users that need fixing
    const needsFix = [];
    const alreadyCorrect = [];

    for (const user of inventoryFactoryUsers) {
      const employee = user.employee_id;

      if (!employee) {
        console.log(`⚠️ ${user.username}: No employee record`);
        continue;
      }

      const hasFacilityId = !!employee.facility_id;
      const hasFactoryStoreId = !!employee.factory_store_id;

      if (hasFacilityId && hasFactoryStoreId) {
        // Verify they're correct types
        const facility = await Facility.findById(employee.facility_id).lean();
        const factoryStore = await Facility.findById(employee.factory_store_id).lean();

        if (facility?.type === "Factory" && factoryStore?.type === "Depot") {
          alreadyCorrect.push({
            username: user.username,
            employee: employee.name,
            factory: facility.name,
            depot: factoryStore.name,
          });
        } else {
          needsFix.push({
            username: user.username,
            employeeId: employee._id,
            employeeName: employee.name,
            currentFacilityId: employee.facility_id,
            currentFactoryStoreId: employee.factory_store_id,
            issue: "Wrong facility types",
          });
        }
      } else {
        needsFix.push({
          username: user.username,
          employeeId: employee._id,
          employeeName: employee.name,
          currentFacilityId: employee.facility_id,
          currentFactoryStoreId: employee.factory_store_id,
          issue: !hasFacilityId ? "Missing facility_id" : "Missing factory_store_id",
        });
      }
    }

    console.log(`✅ Already correct: ${alreadyCorrect.length}`);
    alreadyCorrect.forEach((u) => {
      console.log(`   ${u.username} → ${u.factory} + ${u.depot}`);
    });

    console.log(`\n❌ Need fixing: ${needsFix.length}`);
    needsFix.forEach((u) => {
      console.log(`   ${u.username} (${u.employeeName}) - ${u.issue}`);
    });

    if (needsFix.length === 0) {
      console.log("\n🎉 All Inventory Factory users are correctly configured!");
      process.exit(0);
    }

    console.log("\n" + "=".repeat(80));
    console.log("PROPOSED FIXES");
    console.log("=".repeat(80));

    // Create a mapping strategy
    const fixes = [];

    for (const user of needsFix) {
      let suggestedFactory = null;
      let suggestedDepot = null;

      // Strategy 1: If they have a facility_id, check if it's a Factory or Depot
      if (user.currentFacilityId) {
        const currentFacility = await Facility.findById(user.currentFacilityId).lean();

        if (currentFacility?.type === "Factory") {
          // They have a factory, find a matching depot
          suggestedFactory = currentFacility;
          // Look for a depot with similar name or "Factory Depot" in the name
          suggestedDepot =
            depots.find(
              (d) =>
                d.name.includes(currentFacility.name.replace(" Production", "")) ||
                d.name.includes("Factory Depot")
            ) || depots[0]; // Fallback to first depot
        } else if (currentFacility?.type === "Depot") {
          // They have a depot, find a matching factory
          suggestedDepot = currentFacility;
          // Look for a factory with similar name
          const depotNameBase = currentFacility.name
            .replace(" Factory Depot", "")
            .replace(" Depot", "");
          suggestedFactory =
            factories.find(
              (f) =>
                f.name.includes(depotNameBase) ||
                depotNameBase.includes(f.name.replace(" Production", ""))
            ) || factories[0]; // Fallback to first factory
        }
      } else {
        // No facility assigned, use defaults
        suggestedFactory = factories[0];
        suggestedDepot = depots[0];
      }

      fixes.push({
        employeeId: user.employeeId,
        employeeName: user.employeeName,
        username: user.username,
        factory: suggestedFactory,
        depot: suggestedDepot,
      });

      console.log(`\n${user.username} (${user.employeeName}):`);
      console.log(`  Current issue: ${user.issue}`);
      console.log(`  → Will assign Factory: ${suggestedFactory?.name || "N/A"}`);
      console.log(`  → Will assign Depot: ${suggestedDepot?.name || "N/A"}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log(`Ready to fix ${fixes.length} employees`);
    console.log("=".repeat(80));

    // Apply fixes
    let successCount = 0;
    let errorCount = 0;

    for (const fix of fixes) {
      try {
        await Employee.findByIdAndUpdate(fix.employeeId, {
          facility_id: fix.factory._id,
          factory_store_id: fix.depot._id,
        });

        console.log(`✅ Fixed: ${fix.username} → ${fix.factory.name} + ${fix.depot.name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error fixing ${fix.username}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));
    console.log(`✅ Successfully fixed: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`Total Inventory Factory users: ${inventoryFactoryUsers.length}`);
    console.log(`Already correct: ${alreadyCorrect.length}`);
    console.log(`Newly fixed: ${successCount}`);
    console.log("=".repeat(80));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
fixInventoryFactoryUsers();
