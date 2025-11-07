/**
 * Startup Validation: Check and Fix Employee Role Assignments
 *
 * This migration runs on server startup to ensure all employees
 * have proper facility assignments based on their roles.
 *
 * Specifically checks:
 * - Inventory Factory users have both facility_id (Factory) and factory_store_id (Depot)
 * - Production users have facility_id (Factory)
 * - Inventory Depot users have facility_id (Depot)
 */

const mongoose = require("mongoose");

async function validateAndFixEmployeeAssignments() {
  try {
    console.log("🔍 Running employee role assignment validation...");

    // Load models
    const User = require("../models/User");
    const Employee = require("../models/Employee");
    const Facility = require("../models/Facility");
    const Role = require("../models/Role");

    // Get all active factories and depots
    const factories = await Facility.find({ type: "Factory", active: true }).lean();
    const depots = await Facility.find({ type: "Depot", active: true }).lean();

    if (factories.length === 0 || depots.length === 0) {
      console.log("⚠️ Warning: No factories or depots found. Skipping validation.");
      return;
    }

    console.log(`   Found ${factories.length} factories and ${depots.length} depots`);

    // Get all users with employee_id
    const users = await User.find({
      user_type: "employee",
      employee_id: { $ne: null },
    })
      .populate("employee_id")
      .populate("role_id")
      .lean();

    let fixedCount = 0;
    let issuesFound = 0;

    // Check Inventory Factory users
    const inventoryFactoryUsers = users.filter((u) => u.role_id?.role === "Inventory Factory");

    for (const user of inventoryFactoryUsers) {
      const employee = user.employee_id;
      if (!employee) continue;

      let needsUpdate = false;
      const update = {};

      // Check facility_id
      if (!employee.facility_id) {
        needsUpdate = true;
        update.facility_id = factories[0]._id;
        console.log(`   ⚠️ ${user.username}: Missing facility_id, setting to ${factories[0].name}`);
        issuesFound++;
      } else {
        const facility = await Facility.findById(employee.facility_id).lean();
        if (facility?.type !== "Factory") {
          needsUpdate = true;
          update.facility_id = factories[0]._id;
          console.log(`   ⚠️ ${user.username}: facility_id is not a Factory, fixing...`);
          issuesFound++;
        }
      }

      // Check factory_store_id
      if (!employee.factory_store_id) {
        needsUpdate = true;
        // Try to find a depot with matching name
        const matchingDepot =
          depots.find(
            (d) =>
              d.name.includes("Factory Depot") ||
              d.name.includes(factories[0].name.replace(" Production", ""))
          ) || depots[0];
        update.factory_store_id = matchingDepot._id;
        console.log(
          `   ⚠️ ${user.username}: Missing factory_store_id, setting to ${matchingDepot.name}`
        );
        issuesFound++;
      } else {
        const factoryStore = await Facility.findById(employee.factory_store_id).lean();
        if (factoryStore?.type !== "Depot") {
          needsUpdate = true;
          const matchingDepot = depots.find((d) => d.name.includes("Factory Depot")) || depots[0];
          update.factory_store_id = matchingDepot._id;
          console.log(`   ⚠️ ${user.username}: factory_store_id is not a Depot, fixing...`);
          issuesFound++;
        }
      }

      if (needsUpdate) {
        await Employee.findByIdAndUpdate(employee._id, update);
        fixedCount++;
      }
    }

    // Check Production users
    const productionUsers = users.filter((u) => u.role_id?.role === "Production");

    for (const user of productionUsers) {
      const employee = user.employee_id;
      if (!employee) continue;

      let needsUpdate = false;
      const update = {};

      if (!employee.facility_id) {
        needsUpdate = true;
        update.facility_id = factories[0]._id;
        console.log(
          `   ⚠️ ${user.username} (Production): Missing facility_id, setting to ${factories[0].name}`
        );
        issuesFound++;
      } else {
        const facility = await Facility.findById(employee.facility_id).lean();
        if (facility?.type !== "Factory") {
          needsUpdate = true;
          update.facility_id = factories[0]._id;
          console.log(
            `   ⚠️ ${user.username} (Production): facility_id is not a Factory, fixing...`
          );
          issuesFound++;
        }
      }

      if (needsUpdate) {
        await Employee.findByIdAndUpdate(employee._id, update);
        fixedCount++;
      }
    }

    // Check Inventory Depot users
    const inventoryDepotUsers = users.filter((u) => u.role_id?.role === "Inventory Depot");

    for (const user of inventoryDepotUsers) {
      const employee = user.employee_id;
      if (!employee) continue;

      let needsUpdate = false;
      const update = {};

      if (!employee.facility_id) {
        needsUpdate = true;
        update.facility_id = depots[0]._id;
        console.log(
          `   ⚠️ ${user.username} (Inventory Depot): Missing facility_id, setting to ${depots[0].name}`
        );
        issuesFound++;
      } else {
        const facility = await Facility.findById(employee.facility_id).lean();
        if (facility?.type !== "Depot") {
          needsUpdate = true;
          update.facility_id = depots[0]._id;
          console.log(
            `   ⚠️ ${user.username} (Inventory Depot): facility_id is not a Depot, fixing...`
          );
          issuesFound++;
        }
      }

      if (needsUpdate) {
        await Employee.findByIdAndUpdate(employee._id, update);
        fixedCount++;
      }
    }

    if (issuesFound === 0) {
      console.log("✅ All employee role assignments are valid");
    } else {
      console.log(`✅ Fixed ${fixedCount} employee assignments (${issuesFound} issues found)`);
    }
  } catch (error) {
    console.error("❌ Error in employee validation migration:", error);
    // Don't throw - let server continue starting
  }
}

module.exports = validateAndFixEmployeeAssignments;
