const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
const models = require("./src/models");

async function findRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Try different queries
    const exact = await models.Role.findOne({ role_name: "Inventory Depot" }).lean();
    const regex = await models.Role.findOne({ role_name: /Inventory.*Depot/i }).lean();
    const all = await models.Role.find({ role_name: /inventory/i }).lean();

    console.log("Exact match:", exact ? exact.role_name : "NOT FOUND");
    console.log("Regex match:", regex ? regex.role_name : "NOT FOUND");
    console.log("\nAll inventory roles:");
    all.forEach((r) => console.log(`  "${r.role_name}"`));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

findRole();
