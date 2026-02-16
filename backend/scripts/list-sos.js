const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function listSOs() {
  try {
    await mongoose.connect(MONGODB_URI);

    const Employee = mongoose.model(
      "Employee",
      new mongoose.Schema({}, { strict: false }),
      "employees"
    );

    const sos = await Employee.find({ designation: "SO" }).select("employee_id full_name");

    console.log("\n📋 SOs found in database:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    sos.forEach((so) => {
      console.log(`  ${so.employee_id} - ${so.full_name}`);
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

listSOs();
