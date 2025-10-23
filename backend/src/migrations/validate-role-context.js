/**
 * Validation Script: Check existing users for role-context compliance
 *
 * This script validates that all users with specific roles have the required context:
 * - Inventory role → must have facility_id of type 'Depot'
 * - Production role → must have facility_id of type 'Factory'
 * - ZSM role → must have Zone ID
 * - RSM role → must have Region ID
 * - ASM/SO roles → must have Area ID
 *
 * Run this script to identify users that need their employee context updated.
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function validateUsers() {
  try {
    console.log("🔍 Starting role-context validation for existing users...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");
    const employeesCollection = db.collection("employees");
    const facilitiesCollection = db.collection("facilities");
    const rolesCollection = db.collection("roles");

    // Get all employee users
    const users = await usersCollection
      .find({
        user_type: "employee",
        active: true,
      })
      .toArray();

    console.log(`📊 Found ${users.length} active employee users to validate\n`);

    let validCount = 0;
    let invalidCount = 0;
    const invalidUsers = [];

    for (const user of users) {
      try {
        // Get role
        const role = await rolesCollection.findOne({ _id: user.role_id });
        if (!role) {
          console.log(`⚠️  User ${user.username} has no role assigned`);
          continue;
        }

        // Get employee
        const employee = await employeesCollection.findOne({ _id: user.employee_id });
        if (!employee) {
          console.log(`⚠️  User ${user.username} has no employee record`);
          continue;
        }

        const roleName = role.role;
        let isValid = true;
        let errorMessage = null;

        // Validate based on role
        switch (roleName) {
          case "Inventory":
            if (!employee.facility_id) {
              isValid = false;
              errorMessage = "Inventory role requires a facility assignment";
            } else {
              const facility = await facilitiesCollection.findOne({ _id: employee.facility_id });
              if (!facility) {
                isValid = false;
                errorMessage = "Assigned facility not found";
              } else if (facility.type !== "Depot") {
                isValid = false;
                errorMessage = `Inventory role must be assigned to a Depot (currently: ${facility.type})`;
              }
            }
            break;

          case "Production":
            if (!employee.facility_id) {
              isValid = false;
              errorMessage = "Production role requires a facility assignment";
            } else {
              const facility = await facilitiesCollection.findOne({ _id: employee.facility_id });
              if (!facility) {
                isValid = false;
                errorMessage = "Assigned facility not found";
              } else if (facility.type !== "Factory") {
                isValid = false;
                errorMessage = `Production role must be assigned to a Factory (currently: ${facility.type})`;
              }
            }
            break;

          case "ZSM":
            if (!employee.territory_assignments?.zone_ids?.length) {
              isValid = false;
              errorMessage = "ZSM role requires at least one Zone assignment";
            }
            break;

          case "RSM":
            if (!employee.territory_assignments?.region_ids?.length) {
              isValid = false;
              errorMessage = "RSM role requires at least one Region assignment";
            }
            break;

          case "ASM":
          case "SO":
            if (!employee.territory_assignments?.area_ids?.length) {
              isValid = false;
              errorMessage = `${roleName} role requires at least one Area assignment`;
            }
            break;

          default:
            // Other roles don't have specific requirements (HQ-based)
            break;
        }

        if (isValid) {
          console.log(`✅ ${user.username} (${roleName}) - Valid`);
          validCount++;
        } else {
          console.log(`❌ ${user.username} (${roleName}) - ${errorMessage}`);
          invalidCount++;
          invalidUsers.push({
            username: user.username,
            role: roleName,
            employee_id: employee.employee_id,
            employee_name: employee.name,
            error: errorMessage,
          });
        }
      } catch (error) {
        console.error(`❌ Error validating user ${user.username}:`, error.message);
        invalidCount++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 VALIDATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`✅ Valid users: ${validCount}`);
    console.log(`❌ Invalid users: ${invalidCount}`);
    console.log("=".repeat(80));

    if (invalidUsers.length > 0) {
      console.log("\n⚠️  USERS REQUIRING ATTENTION:\n");
      invalidUsers.forEach((u) => {
        console.log(`  • ${u.username} (${u.role}) - ${u.employee_name} [${u.employee_id}]`);
        console.log(`    Error: ${u.error}\n`);
      });
    }

    // Close connection
    await mongoose.connection.close();
    console.log("\n✅ Validation completed!");
  } catch (error) {
    console.error("\n❌ Validation failed:", error);
    process.exit(1);
  }
}

// Run validation
validateUsers();
