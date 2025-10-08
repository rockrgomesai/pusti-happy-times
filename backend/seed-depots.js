/**
 * Seed Depots Collection
 * Pusti Happy Times - Initial Depot Data Setup
 *
 * Usage: node seed-depots.js
 */

require("dotenv").config({ path: `${__dirname}/.env` });
const mongoose = require("mongoose");
const Depot = require("./src/models/Depot");
const { User } = require("./src/models");

const depotsToEnsure = [
  { name: "Dhaka Depot" },
  { name: "Chittagong Depot" },
];

const connectDatabase = async () => {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("✅ Connected to MongoDB");
};

const resolveAuditUser = async () => {
  const user = await User.findOne({}).select("_id username");

  if (!user) {
    throw new Error(
      "No users found. Please create an administrative user before seeding depots."
    );
  }

  return user;
};

const seedDepots = async () => {
  console.log("🌱 Ensuring default depots are available...");

  const auditUser = await resolveAuditUser();
  console.log(`📝 Using audit user: ${auditUser.username}`);

  const results = [];

  for (const depotData of depotsToEnsure) {
    const existing = await Depot.findOne({ name: depotData.name });

    if (existing) {
      console.log(`ℹ️  Depot already exists: ${depotData.name}`);
      results.push({ name: depotData.name, created: false, id: existing._id });
      continue;
    }

    const depot = new Depot({
      name: depotData.name,
      created_by: auditUser._id,
      updated_by: auditUser._id,
    });

    await depot.save();
    results.push({ name: depotData.name, created: true, id: depot._id });
    console.log(`✅ Created depot: ${depotData.name} (ID: ${depot._id})`);
  }

  console.log("\n📈 Summary");
  results.forEach((entry, index) => {
    const status = entry.created ? "created" : "existing";
    console.log(` ${index + 1}. ${entry.name} - ${status} (ID: ${entry.id})`);
  });

  return results;
};

const main = async () => {
  try {
    await connectDatabase();
    await seedDepots();
    console.log("\n🎉 Depot seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding depots:", error.message || error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    }
  }
};

if (require.main === module) {
  main();
}

module.exports = { seedDepots, depotsToEnsure };
