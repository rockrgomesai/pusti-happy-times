require("dotenv").config();
const mongoose = require("mongoose");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkEmployee() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find the employee
    const employee = await db.collection("employees").findOne({
      name: "Area Manager Mango",
    });

    if (!employee) {
      console.log("❌ Employee not found");
    } else {
      console.log("👨‍💼 Full Employee Record:");
      console.log(JSON.stringify(employee, null, 2));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkEmployee();
