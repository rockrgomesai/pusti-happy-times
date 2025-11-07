const mongoose = require("mongoose");
const Offer = require("./src/models/Offer");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    const distId = new mongoose.Types.ObjectId("68f2855fbdde87d90d1ba252");

    console.log("Testing findEligibleForDistributor...");
    try {
      const offers = await Offer.findEligibleForDistributor(distId);
      console.log("Found offers:", offers.length);

      if (offers.length > 0) {
        console.log("\nFirst offer:");
        console.log("Name:", offers[0].name);
        console.log("Type:", offers[0].offer_type);
        console.log("Status:", offers[0].status);
        console.log("Active:", offers[0].active);
        console.log("Products:", offers[0].config?.selectedProducts?.length || 0);
      }
    } catch (e) {
      console.error("Error:", e.message);
      console.error("Stack:", e.stack);
    }

    process.exit(0);
  })
  .catch((e) => {
    console.error("Connection error:", e);
    process.exit(1);
  });
