const mongoose = require("mongoose");
const Offer = require("./src/models/Offer");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function activateOffer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const result = await Offer.updateOne({ name: "All Winter" }, { $set: { status: "active" } });

    console.log(`\nUpdated ${result.modifiedCount} offer(s) to active status`);

    const offer = await Offer.findOne({ name: "All Winter" }).select("name status active").lean();
    console.log("\nOffer after update:");
    console.log(`  Name: ${offer.name}`);
    console.log(`  Status: ${offer.status}`);
    console.log(`  Active: ${offer.active}`);

    await mongoose.connection.close();
    console.log("\nDone!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

activateOffer();
