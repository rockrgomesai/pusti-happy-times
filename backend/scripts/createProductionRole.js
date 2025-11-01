/**
 * Create Production Role
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function createProductionRole() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const Role = require("../src/models/Role");

    // Check if Production role exists
    let productionRole = await Role.findOne({ role: "Production" });

    if (productionRole) {
      console.log(`✅ Production role already exists: ${productionRole._id}`);
    } else {
      productionRole = await Role.create({
        role: "Production",
        active: true,
      });
      console.log(`✅ Created Production role: ${productionRole._id}`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

createProductionRole();
