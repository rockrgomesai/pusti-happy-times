const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

async function checkAndAddTransports() {
  try {
    const Transport = mongoose.model(
      "Transport",
      new mongoose.Schema({}, { strict: false }),
      "transports"
    );

    const count = await Transport.countDocuments();
    console.log(`\n📋 Found ${count} transports in database`);

    if (count === 0) {
      console.log("\n⚠️  No transports found. Adding sample transports...");

      // Add some sample transports
      const sampleTransports = [
        {
          transport: "A1 Transport Ltd",
          created_at: new Date(),
          updated_at: new Date(),
          created_by: new mongoose.Types.ObjectId(),
          updated_by: new mongoose.Types.ObjectId(),
        },
        {
          transport: "Express Logistics",
          created_at: new Date(),
          updated_at: new Date(),
          created_by: new mongoose.Types.ObjectId(),
          updated_by: new mongoose.Types.ObjectId(),
        },
        {
          transport: "Fast Delivery Co",
          created_at: new Date(),
          updated_at: new Date(),
          created_by: new mongoose.Types.ObjectId(),
          updated_by: new mongoose.Types.ObjectId(),
        },
      ];

      await Transport.insertMany(sampleTransports);
      console.log("✅ Added 3 sample transports");
    } else {
      const transports = await Transport.find().limit(10);
      console.log("\n📋 Sample transports:");
      transports.forEach((t) => {
        console.log(`   - ${t.transport} (ID: ${t._id})`);
      });
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

checkAndAddTransports();
