/**
 * Create two Inventory Depot users/employees
 * These users work at independent depots (not inside factories)
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
const Employee = require("../src/models/Employee");
const Role = require("../src/models/Role");
const Facility = require("../src/models/Facility");
const Designation = require("../src/models/Designation");
require("dotenv").config();

async function createInventoryDepotUsers() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ Connected to MongoDB");

    // Get Inventory Depot role
    const inventoryDepotRole = await Role.findOne({ role: "Inventory Depot" });
    if (!inventoryDepotRole) {
      console.error("❌ Inventory Depot role not found. Please create it first.");
      process.exit(1);
    }
    console.log("✅ Found Inventory Depot role:", inventoryDepotRole._id);

    // Get Inventory Manager designation (or any active designation)
    let designation = await Designation.findOne({ active: true });
    if (!designation) {
      console.error("❌ No active designation found. Please create one first.");
      process.exit(1);
    }
    console.log("✅ Using designation:", designation.name);

    // Find some independent depots (type: 'Depot', not inside factories)
    const depots = await Facility.find({
      type: "Depot",
      name: { $regex: /^((?!Factory|Production|Plant).)*$/i }, // Exclude factory-related names
    }).limit(2);

    if (depots.length < 2) {
      console.error("❌ Need at least 2 independent depots. Please create them first.");
      console.log(
        "Available depots:",
        depots.map((d) => d.name)
      );
      process.exit(1);
    }

    console.log(`✅ Found ${depots.length} depots:`);
    depots.forEach((depot) => console.log(`   - ${depot.name}`));

    // Get a admin user to use as created_by
    const adminUser = await User.findOne({ username: /admin/i }).populate("employee_id");
    if (!adminUser || !adminUser.employee_id) {
      console.error("❌ Admin user or employee not found");
      process.exit(1);
    }
    console.log("✅ Using admin employee as creator:", adminUser.username);

    const users = [
      {
        username: "inventorymanagerpapaya",
        password: "password123",
        employee_name: "Papaya Inventory Manager",
        depot: depots[0],
      },
      {
        username: "inventorymanagergrape",
        password: "password123",
        employee_name: "Grape Inventory Manager",
        depot: depots[1],
      },
    ];

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ username: userData.username });
      if (existingUser) {
        console.log(`⚠️  User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Create employee
      const employee = new Employee({
        employee_id: `INV-${userData.username.slice(-6).toUpperCase()}`,
        name: userData.employee_name,
        employee_type: "facility",
        facility_id: userData.depot._id, // For depot users, store depot in facility_id only
        // Do NOT set factory_store_id - only allowed for Factory-type facilities
        designation_id: designation._id,
        email: `${userData.username}@example.com`,
        mobile_personal: "01700000000",
        // Required personal info
        father_name: "N/A",
        mother_name: "N/A",
        date_birth: "1990-01-01",
        gender: "male",
        religion: "Islam",
        marital_status: "single",
        nationality: "Bangladeshi",
        national_id: `1990${Math.random().toString().slice(2, 13)}`,
        blood_group: "O+",
        // Address
        present_address: {
          holding_no: "N/A",
          road: "N/A",
          city: "Dhaka",
          post_code: 1000,
        },
        permanent_address: {
          holding_no: "N/A",
          village_road: "N/A",
          union_ward: "N/A",
          upazila_thana: "N/A",
          district: "Dhaka",
          division: "Dhaka",
        },
        // Minimal required fields
        emergency_contact: "N/A",
        emergency_mobile: "01700000000",
        ssc_year: 2008,
        highest_degree: "Bachelor",
        experience_years: 5,
        status: "active",
        created_by: adminUser.employee_id._id,
        updated_by: adminUser.employee_id._id,
      });

      await employee.save();
      console.log(`✅ Created employee: ${employee.name} at ${userData.depot.name}`);

      // Create user
      const user = new User({
        username: userData.username,
        password: userData.password, // Will be hashed by pre-save hook
        email: `${userData.username}@example.com`,
        user_type: "employee",
        employee_id: employee._id,
        role_id: inventoryDepotRole._id,
        active: true,
        created_by: adminUser.employee_id._id,
        updated_by: adminUser.employee_id._id,
      });

      await user.save();
      console.log(`✅ Created user: ${userData.username} with Inventory Depot role`);
      console.log(`   📍 Depot: ${userData.depot.name}`);
      console.log(`   🔑 Password: ${userData.password}`);
    }

    console.log("\n✅ Successfully created Inventory Depot users!");
    console.log("\nLogin credentials:");
    users.forEach((u) => {
      console.log(`  Username: ${u.username}`);
      console.log(`  Password: ${u.password}`);
      console.log(`  Depot: ${u.depot.name}\n`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");
  }
}

createInventoryDepotUsers();
