require("dotenv").config();
const mongoose = require("mongoose");
const Employee = require("../src/models/Employee");

async function clean() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await Employee.deleteMany({
    employee_id: { $in: ["INV-PAPAYA", "INV--GRAPE"] },
  });
  console.log("Deleted", result.deletedCount, "employees");
  process.exit();
}

clean();
