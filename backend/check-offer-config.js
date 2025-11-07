require("dotenv").config();
const mongoose = require("mongoose");
const Offer = require("./src/models/Offer");

async function checkOffer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const offer = await Offer.findOne({ name: "All Winter" });

    if (offer) {
      console.log("\nOffer:", offer.name);
      console.log("Config:", JSON.stringify(offer.config, null, 2));
      console.log("\nMin Order Value:", offer.config?.minOrderValue);
      console.log("Discount Percentage:", offer.config?.discountPercentage);
      console.log("Max Discount Amount:", offer.config?.maxDiscountAmount);
    } else {
      console.log("Offer not found");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkOffer();
