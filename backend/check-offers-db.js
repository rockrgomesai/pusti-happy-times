#!/usr/bin/env node

const mongoose = require("mongoose");
require("dotenv").config();

const Offer = require("./src/models/Offer");

async function checkOffers() {
  try {
    console.log("Connecting to MongoDB...");
    console.log("URI:", process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected successfully\n");

    // Get total count
    const total = await Offer.countDocuments({});
    console.log(`📊 Total offers in database: ${total}\n`);

    // Get all offers
    const offers = await Offer.find({})
      .select("_id name offer_type status active start_date end_date createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (offers.length === 0) {
      console.log("⚠️  No offers found in database!");
    } else {
      console.log("📋 All offers in database:");
      console.log("─".repeat(80));
      offers.forEach((offer, index) => {
        console.log(`${index + 1}. ${offer.name}`);
        console.log(`   ID: ${offer._id}`);
        console.log(`   Type: ${offer.offer_type}`);
        console.log(`   Status: ${offer.status} | Active: ${offer.active}`);
        console.log(
          `   Period: ${offer.start_date.toISOString().split("T")[0]} to ${offer.end_date.toISOString().split("T")[0]}`
        );
        console.log(`   Created: ${offer.createdAt.toISOString()}`);
        console.log("");
      });
    }

    // Check active offers
    const activeOffers = await Offer.countDocuments({ active: true });
    console.log(`\n✅ Active offers: ${activeOffers}`);

    const draftOffers = await Offer.countDocuments({ status: "draft" });
    console.log(`📝 Draft offers: ${draftOffers}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  }
}

checkOffers();
