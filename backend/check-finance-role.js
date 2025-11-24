const mongoose = require("mongoose");
require("dotenv").config();

const Role = require("./src/models/Role");

async function checkFinanceRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_ht_mern");
    console.log("✅ Connected to MongoDB");

    // Find all roles with Finance in the name
    const roles = await Role.find({
      role: /finance/i,
    }).select("role _id");

    console.log("\n📋 Roles matching 'finance':");
    console.log(JSON.stringify(roles, null, 2));

    // Also get all roles to see the exact names
    const allRoles = await Role.find({}).select("role _id").sort("role");
    console.log("\n📋 All roles in database:");
    allRoles.forEach((r) => {
      console.log(`  - "${r.role}" (ID: ${r._id})`);
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkFinanceRole();
