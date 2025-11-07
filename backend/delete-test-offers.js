const mongoose = require("mongoose");
const Offer = require("./src/models/Offer");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function deleteTestOffers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Delete all offers (since we created them for testing)
    const result = await Offer.deleteMany({});

    console.log(`Deleted ${result.deletedCount} offers`);

    await mongoose.connection.close();
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

deleteTestOffers();
