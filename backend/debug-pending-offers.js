/**
 * Debug pending offers query
 */

const mongoose = require("mongoose");
const OfferSend = require("./src/models/OfferSend");

const MONGODB_URI =
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function debugPendingOffers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get the dcdepo user's facility_id
    const User = require("./src/models/User");
    const dcdepo = await User.findOne({ username: "dcdepo" });

    if (!dcdepo) {
      console.log("❌ dcdepo user not found");
      process.exit(1);
    }

    console.log("✅ Found dcdepo user:", dcdepo._id);
    console.log("   Facility ID:", dcdepo.facility_id);

    if (!dcdepo.facility_id) {
      console.log("❌ dcdepo user has no facility assigned");
      process.exit(1);
    }

    const facilityId = dcdepo.facility_id;

    // Count all offer sends
    const totalSends = await OfferSend.countDocuments();
    console.log(`\n📊 Total offer sends in DB: ${totalSends}`);

    // Count sends for this depot
    const sendsForDepot = await OfferSend.countDocuments({
      depot_ids: facilityId,
    });
    console.log(`📊 Offer sends for this depot: ${sendsForDepot}`);

    // Check depot_status structure
    const sampleSend = await OfferSend.findOne({ depot_ids: facilityId });
    if (sampleSend) {
      console.log("\n📋 Sample send record:");
      console.log("   ID:", sampleSend._id);
      console.log("   Ref No:", sampleSend.ref_no);
      console.log("   Depot Status Array:", JSON.stringify(sampleSend.depot_status, null, 2));
    }

    // Try the actual query
    console.log("\n🔍 Running actual query...");
    const startTime = Date.now();

    const pendingSends = await OfferSend.find({
      depot_ids: facilityId,
      "depot_status.depot_id": facilityId,
      "depot_status.status": "pending",
      is_deleted: false,
    }).maxTimeMS(5000); // 5 second timeout

    const elapsed = Date.now() - startTime;
    console.log(`✅ Query completed in ${elapsed}ms`);
    console.log(`📊 Found ${pendingSends.length} pending sends`);

    if (pendingSends.length > 0) {
      console.log("\n📋 First pending send:");
      console.log(JSON.stringify(pendingSends[0], null, 2));
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

debugPendingOffers();
