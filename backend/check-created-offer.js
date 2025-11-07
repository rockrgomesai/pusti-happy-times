const mongoose = require("mongoose");
const Offer = require("./src/models/Offer");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function checkOffer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const offers = await Offer.find({}).lean();

    console.log(`\nFound ${offers.length} offer(s)\n`);

    offers.forEach((offer, index) => {
      console.log(`Offer ${index + 1}:`);
      console.log(`  Name: ${offer.name}`);
      console.log(`  Type: ${offer.offer_type}`);
      console.log(`  Status: ${offer.status}`);
      console.log(`  Active: ${offer.active}`);
      console.log(`  Product Segments:`, offer.product_segments);
      console.log(`  Distributors:`, JSON.stringify(offer.distributors, null, 2));
      console.log(`  Start Date: ${offer.start_date}`);
      console.log(`  End Date: ${offer.end_date}`);
      console.log(`  Config:`, JSON.stringify(offer.config, null, 2));
      console.log("\n---\n");
    });

    await mongoose.connection.close();
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkOffer();
