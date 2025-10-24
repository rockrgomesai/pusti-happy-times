require("dotenv").config();
const mongoose = require("mongoose");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkUser() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find the user
    const user = await db.collection("users").findOne({ username: "areamanagermango" });

    if (!user) {
      console.log("❌ User not found");
    } else {
      console.log("👤 User Details:");
      console.log(`  Username: ${user.username}`);
      console.log(`  User Type: ${user.user_type}`);
      console.log(`  Employee ID: ${user.employee_id}`);
      console.log(`  Active: ${user.active}`);
      console.log("");

      // Find the employee if employee_id exists
      if (user.employee_id) {
        const employee = await db.collection("employees").findOne({ _id: user.employee_id });
        if (employee) {
          console.log("👨‍💼 Employee Details:");
          console.log(`  Name: ${employee.name}`);
          console.log(`  Type: ${employee.employee_type}`);
          console.log(`  Designation ID: ${employee.designation_id}`);
          console.log(`  Territory ID: ${employee.territory_id}`);
          console.log(`  Active: ${employee.active}`);
        } else {
          console.log("❌ Employee not found for employee_id:", user.employee_id);
        }
      } else {
        console.log("❌ No employee_id assigned to user");

        // Search for employee by name
        const employee = await db.collection("employees").findOne({
          name: /Area Manager Mango/i,
        });

        if (employee) {
          console.log("\n🔍 Found matching employee:");
          console.log(`  Name: ${employee.name}`);
          console.log(`  ID: ${employee._id}`);
          console.log(`  Type: ${employee.employee_type}`);
          console.log(`  Active: ${employee.active}`);
        }
      }
    }

    // Check all field employees
    console.log("\n📋 All Field Employees:");
    const fieldEmployees = await db
      .collection("employees")
      .find({
        employee_type: "field",
        active: true,
      })
      .toArray();

    fieldEmployees.forEach((emp) => {
      const user = emp.name ? emp.name.toLowerCase().replace(/\s+/g, "") : "";
      console.log(`  - ${emp.name} (${emp._id})`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkUser();
