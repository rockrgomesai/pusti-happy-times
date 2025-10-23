/**
 * Migration 011: Convert facility_assignments to single facility_id
 *
 * Changes:
 * 1. Converts facility_assignments.factory_ids and depot_ids arrays to single facility_id
 * 2. Takes the first facility from the arrays if multiple exist
 * 3. Removes the facility_assignments field
 *
 * Rollback:
 * To rollback, restore from backup or manually recreate facility_assignments structure
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function migrate() {
  try {
    console.log("🔄 Starting migration 011: facility_assignments to facility_id...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const employeesCollection = db.collection("employees");

    // Step 1: Find all facility employees with facility_assignments
    console.log("📊 Finding facility employees with facility_assignments...");
    const facilityEmployees = await employeesCollection
      .find({
        employee_type: "facility",
        facility_assignments: { $exists: true },
      })
      .toArray();

    console.log(`Found ${facilityEmployees.length} facility employees to migrate\n`);

    if (facilityEmployees.length === 0) {
      console.log("✅ No employees need migration");
      await mongoose.connection.close();
      return;
    }

    // Step 2: Update each employee
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const employee of facilityEmployees) {
      try {
        const facilityAssignments = employee.facility_assignments || {};
        const factoryIds = facilityAssignments.factory_ids || [];
        const depotIds = facilityAssignments.depot_ids || [];

        // Determine which facility to assign
        let facilityId = null;

        // Priority: depot first, then factory
        if (depotIds.length > 0) {
          facilityId = depotIds[0];
          if (depotIds.length > 1) {
            console.log(
              `⚠️  Employee ${employee.employee_id} has ${depotIds.length} depots, using first one`
            );
          }
        } else if (factoryIds.length > 0) {
          facilityId = factoryIds[0];
          if (factoryIds.length > 1) {
            console.log(
              `⚠️  Employee ${employee.employee_id} has ${factoryIds.length} factories, using first one`
            );
          }
        }

        if (!facilityId) {
          console.log(`⚠️  Skipping employee ${employee.employee_id} - no facilities assigned`);
          skippedCount++;
          continue;
        }

        // Update employee: set facility_id and remove facility_assignments
        const result = await employeesCollection.updateOne(
          { _id: employee._id },
          {
            $set: { facility_id: facilityId },
            $unset: { facility_assignments: "" },
          }
        );

        if (result.modifiedCount > 0) {
          console.log(
            `✅ Updated employee ${employee.employee_id} (${employee.name}) with facility_id: ${facilityId}`
          );
          successCount++;
        } else {
          console.log(`⚠️  No changes for employee ${employee.employee_id}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating employee ${employee.employee_id}:`, error.message);
        errorCount++;
      }
    }

    // Step 3: Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`✅ Successfully updated: ${successCount} employees`);
    console.log(`⚠️  Skipped: ${skippedCount} employees`);
    console.log(`❌ Errors: ${errorCount} employees`);
    console.log("=".repeat(80) + "\n");

    // Step 4: Verify changes
    console.log("🔍 Verifying changes...");
    const updatedCount = await employeesCollection.countDocuments({
      employee_type: "facility",
      facility_id: { $exists: true, $ne: null },
    });

    const oldStructureCount = await employeesCollection.countDocuments({
      employee_type: "facility",
      facility_assignments: { $exists: true },
    });

    console.log(`✅ Employees with facility_id: ${updatedCount}`);
    console.log(`⚠️  Employees with old facility_assignments: ${oldStructureCount}`);

    if (oldStructureCount > 0) {
      console.log("\n⚠️  Warning: Some employees still have old facility_assignments structure");
    } else {
      console.log("\n✅ All facility employees successfully migrated!");
    }

    // Close connection
    await mongoose.connection.close();
    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrate();
