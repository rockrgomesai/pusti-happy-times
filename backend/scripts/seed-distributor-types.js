/**
 * Seed Initial Distributor Types
 * Creates distributor types from the existing hardcoded values
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const setup = async () => {
  try {
    console.log("\n🚀 Seeding Initial Distributor Types...\n");

    const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");

    const db = mongoose.connection.db;

    // Get superadmin user for audit fields
    const user = await db.collection("users").findOne({ username: "superadmin" });

    if (!user) {
      console.error("❌ SuperAdmin user not found");
      process.exit(1);
    }

    const typesCollection = db.collection("distributor_types");

    // Initial distributor types from the hardcoded values
    const initialTypes = [
      {
        type_name: "Commission Distributor",
        description: "Distributor working on commission basis",
        active: true,
      },
      {
        type_name: "General Distributor",
        description: "Standard distributor type",
        active: true,
      },
      {
        type_name: "Special Distributor",
        description: "Distributor with special arrangements",
        active: true,
      },
      {
        type_name: "Spot Distributor",
        description: "Distributor for spot/immediate sales",
        active: true,
      },
      {
        type_name: "Super Distributor",
        description: "Top-tier distributor with wider coverage",
        active: true,
      },
    ];

    const now = new Date();

    for (const typeData of initialTypes) {
      const exists = await typesCollection.findOne({ type_name: typeData.type_name });

      if (exists) {
        console.log(`⚠️  Type already exists: ${typeData.type_name}`);
      } else {
        await typesCollection.insertOne({
          ...typeData,
          created_at: now,
          created_by: user._id,
          updated_at: now,
          updated_by: user._id,
        });
        console.log(`✅ Created type: ${typeData.type_name}`);
      }
    }

    console.log("\n✅ Distributor types seeded successfully!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
};

setup();
