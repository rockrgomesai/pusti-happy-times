/**
 * Seed Factories Collection
 * Pusti Happy Times - Initial Factory Data Setup
 *
 * Usage: node seed-factories.js
 */

require("dotenv").config({ path: `${__dirname}/.env` });
const mongoose = require("mongoose");
const Factory = require("./src/models/Factory");
const { User } = require("./src/models");

const factoriesToEnsure = [
  { name: "Gazipur Factory" },
  { name: "Chittagong Factory" },
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
      "No users found. Please create an administrative user before seeding factories."
    );
  }

  return user;
};

const seedFactories = async () => {
  console.log("🌱 Ensuring default factories are available...");

  const auditUser = await resolveAuditUser();
  console.log(`📝 Using audit user: ${auditUser.username}`);

  const results = [];

  for (const factoryData of factoriesToEnsure) {
    const existing = await Factory.findOne({ name: factoryData.name });

    if (existing) {
      console.log(`ℹ️  Factory already exists: ${factoryData.name}`);
      results.push({ name: factoryData.name, created: false, id: existing._id });
      continue;
    }

    const factory = new Factory({
      name: factoryData.name,
      created_by: auditUser._id,
      updated_by: auditUser._id,
    });

    await factory.save();
    results.push({ name: factoryData.name, created: true, id: factory._id });
    console.log(`✅ Created factory: ${factoryData.name} (ID: ${factory._id})`);
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
    await seedFactories();
    console.log("\n🎉 Factory seeding complete!");
  } catch (error) {
  console.error("❌ Error seeding factories:", error.message || error);
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

module.exports = { seedFactories, factoriesToEnsure };
