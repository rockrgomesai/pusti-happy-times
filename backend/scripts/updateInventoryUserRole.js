/**
 * Update existing Inventory user to Inventory Factory role
 */

const mongoose = require("mongoose");
const User = require("../src/models/User");
const Employee = require("../src/models/Employee");
const Role = require("../src/models/Role");
require("dotenv").config();

async function updateInventoryUserRole() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ Connected to MongoDB");

    // Get Inventory Factory role
    const inventoryFactoryRole = await Role.findOne({ role: "Inventory Factory" });
    if (!inventoryFactoryRole) {
      console.error("❌ Inventory Factory role not found. Please create it first.");
      process.exit(1);
    }
    console.log("✅ Found Inventory Factory role:", inventoryFactoryRole._id);

    // Find and update the existing inventory user
    const user = await User.findOne({ username: "inventorymanagerruby" })
      .populate("role_id")
      .populate("employee_id");

    if (!user) {
      console.error("❌ User 'inventorymanagerruby' not found.");
      process.exit(1);
    }

    console.log(`\n📋 Current user info:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Current role: ${user.role_id?.role || "N/A"}`);
    console.log(`   Employee: ${user.employee_id?.name || "N/A"}`);

    // Update to Inventory Factory role
    user.role_id = inventoryFactoryRole._id;
    await user.save();

    console.log(`\n✅ Updated ${user.username} to Inventory Factory role`);
    console.log(`   New role: Inventory Factory`);
    console.log(`   This user can now receive goods from production`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

updateInventoryUserRole();
