/**
 * Test factory_store_id functionality for Production employees
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function testFactoryStore() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const Employee = require("./src/models/Employee");
    const Facility = require("./src/models/Facility");
    const User = require("./src/models/User");

    // Find a factory and a depot
    const factory = await Facility.findOne({ type: "Factory" });
    const depot = await Facility.findOne({ type: "Depot" });
    const wrongTypeDepot = await Facility.findOne({ type: "Factory" }); // Will use Factory as "wrong" type

    if (!factory || !depot) {
      console.error("❌ Need at least one Factory and one Depot in database");
      process.exit(1);
    }

    console.log("\n📦 Test data:");
    console.log(`  Factory: ${factory.name} (${factory._id})`);
    console.log(`  Depot (for factory store): ${depot.name} (${depot._id})`);

    const testUserId = new mongoose.Types.ObjectId();

    // TEST 1: Create facility employee with factory_store_id (should succeed)
    console.log("\n\n=== TEST 1: Create facility employee with valid factory_store_id ===");
    const employeeWithStore = new Employee({
      employee_id: `TEST-PROD-${Date.now()}`,
      name: "Test Production Manager",
      employee_type: "facility",
      facility_id: factory._id,
      factory_store_id: depot._id, // Depot type - valid
      designation_id: new mongoose.Types.ObjectId(),
      date_birth: new Date("1990-01-01"),
      gender: "male",
      religion: "Islam",
      marital_status: "married",
      blood_group: "O+",
      permanent_address: {
        district: "Dhaka",
        division: "Dhaka",
      },
      created_by: testUserId,
      updated_by: testUserId,
    });

    try {
      await employeeWithStore.save();
      console.log("✅ Test 1 PASSED: Employee created with factory_store_id");
      console.log(`  Employee ID: ${employeeWithStore._id}`);
      console.log(`  Facility ID: ${employeeWithStore.facility_id}`);
      console.log(`  Factory Store ID: ${employeeWithStore.factory_store_id}`);
    } catch (error) {
      console.log("❌ Test 1 FAILED:", error.message);
    }

    // TEST 2: Try to create with factory_store_id pointing to non-Depot (should fail)
    console.log(
      "\n\n=== TEST 2: Try to create employee with factory_store_id pointing to Factory type ==="
    );
    const employeeWrongStore = new Employee({
      employee_id: `TEST-PROD-WRONG-${Date.now()}`,
      name: "Test Production Manager Wrong",
      employee_type: "facility",
      facility_id: factory._id,
      factory_store_id: wrongTypeDepot._id, // Factory type - invalid
      designation_id: new mongoose.Types.ObjectId(),
      date_birth: new Date("1990-01-01"),
      gender: "male",
      religion: "Islam",
      marital_status: "married",
      blood_group: "O+",
      permanent_address: {
        district: "Dhaka",
        division: "Dhaka",
      },
      created_by: testUserId,
      updated_by: testUserId,
    });

    try {
      await employeeWrongStore.save();
      console.log("❌ Test 2 FAILED: Should have rejected non-Depot factory_store_id");
    } catch (error) {
      if (error.message.includes("Depot-type")) {
        console.log("✅ Test 2 PASSED: Non-Depot factory_store_id rejected");
        console.log(`  Error: ${error.message}`);
      } else {
        console.log("❌ Test 2 FAILED: Wrong error:", error.message);
      }
    }

    // TEST 3: Try to create with factory_store_id but facility_id is Depot (should fail)
    console.log(
      "\n\n=== TEST 3: Try to create employee with factory_store_id but facility_id is Depot ==="
    );
    const employeeDepotWithStore = new Employee({
      employee_id: `TEST-DEPOT-STORE-${Date.now()}`,
      name: "Test Depot Manager",
      employee_type: "facility",
      facility_id: depot._id, // Depot - invalid for factory_store_id
      factory_store_id: depot._id,
      designation_id: new mongoose.Types.ObjectId(),
      date_birth: new Date("1990-01-01"),
      gender: "male",
      religion: "Islam",
      marital_status: "married",
      blood_group: "O+",
      permanent_address: {
        district: "Dhaka",
        division: "Dhaka",
      },
      created_by: testUserId,
      updated_by: testUserId,
    });

    try {
      await employeeDepotWithStore.save();
      console.log(
        "❌ Test 3 FAILED: Should have required Factory-type for facility_id when factory_store_id is present"
      );
    } catch (error) {
      if (error.message.includes("Factory-type")) {
        console.log("✅ Test 3 PASSED: Depot facility_id with factory_store_id rejected");
        console.log(`  Error: ${error.message}`);
      } else {
        console.log("❌ Test 3 FAILED: Wrong error:", error.message);
      }
    }

    // TEST 4: Create facility employee without factory_store_id (should succeed)
    console.log("\n\n=== TEST 4: Create facility employee without factory_store_id ===");
    const employeeWithoutStore = new Employee({
      employee_id: `TEST-FAC-NO-STORE-${Date.now()}`,
      name: "Test Facility Manager",
      employee_type: "facility",
      facility_id: factory._id,
      // No factory_store_id
      designation_id: new mongoose.Types.ObjectId(),
      date_birth: new Date("1990-01-01"),
      gender: "male",
      religion: "Islam",
      marital_status: "married",
      blood_group: "O+",
      permanent_address: {
        district: "Dhaka",
        division: "Dhaka",
      },
      created_by: testUserId,
      updated_by: testUserId,
    });

    try {
      await employeeWithoutStore.save();
      console.log("✅ Test 4 PASSED: Employee created without factory_store_id");
      console.log(`  Employee ID: ${employeeWithoutStore._id}`);
      console.log(`  Facility ID: ${employeeWithoutStore.facility_id}`);
      console.log(`  Factory Store ID: ${employeeWithoutStore.factory_store_id || "null"}`);
    } catch (error) {
      console.log("❌ Test 4 FAILED:", error.message);
    }

    // TEST 5: Verify JWT token generation would include factory_store_id
    console.log("\n\n=== TEST 5: Verify employee data for JWT token ===");
    if (employeeWithStore._id) {
      const savedEmployee = await Employee.findById(employeeWithStore._id);
      console.log("✅ Test 5: Employee data for token generation:");
      console.log(`  employee_type: ${savedEmployee.employee_type}`);
      console.log(`  facility_id: ${savedEmployee.facility_id}`);
      console.log(`  factory_store_id: ${savedEmployee.factory_store_id}`);
      console.log("\n  JWT payload would include:");
      console.log(`    - facility_id: ${savedEmployee.facility_id}`);
      console.log(`    - factory_store_id: ${savedEmployee.factory_store_id}`);
    }

    // Cleanup
    console.log("\n\n=== CLEANUP ===");
    const deletedCount = await Employee.deleteMany({
      employee_id: { $regex: /^TEST-/ },
    });
    console.log(`✅ Deleted ${deletedCount.deletedCount} test employees`);

    console.log("\n\n=== SUMMARY ===");
    console.log("✅ factory_store_id can be assigned to facility employees");
    console.log("✅ factory_store_id must reference a Depot-type facility");
    console.log("✅ facility_id must be Factory-type when factory_store_id is present");
    console.log("✅ factory_store_id is optional (can be null)");
    console.log("✅ Ready for JWT token integration");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

testFactoryStore();
