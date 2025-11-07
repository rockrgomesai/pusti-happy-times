#!/usr/bin/env node

const mongoose = require("mongoose");
require("dotenv").config();

const Offer = require("./src/models/Offer");
const { Distributor } = require("./src/models");

async function checkOfferEligibility() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected\n");

    // Get all offers
    const offers = await Offer.find({})
      .select("_id name offer_type status active product_segments distributors territories")
      .lean();

    console.log(`Found ${offers.length} offers:\n`);
    console.log("═".repeat(100));

    for (const offer of offers) {
      console.log(`\n📦 OFFER: ${offer.name}`);
      console.log(`   ID: ${offer._id}`);
      console.log(`   Type: ${offer.offer_type}`);
      console.log(`   Status: ${offer.status} | Active: ${offer.active}`);
      console.log(`   Segments: ${offer.product_segments.join(", ")}`);

      // Distributor targeting
      if (offer.distributors && offer.distributors.ids && offer.distributors.ids.length > 0) {
        console.log(`\n   🎯 DISTRIBUTOR TARGETING:`);
        console.log(`   Mode: ${offer.distributors.mode}`);
        console.log(`   Count: ${offer.distributors.ids.length} distributors`);

        // Get distributor details
        const distIds = offer.distributors.ids;
        const distributors = await Distributor.find({ _id: { $in: distIds } })
          .select("name mobile db_point_id product_segment")
          .populate("db_point_id", "name type")
          .lean();

        console.log(`   Targeted distributors:`);
        distributors.forEach((d, i) => {
          console.log(`      ${i + 1}. ${d.name} (${d.mobile})`);
          console.log(`         Segment: ${d.product_segment.join(", ")}`);
          console.log(`         DB Point: ${d.db_point_id?.name || "N/A"}`);
        });
      } else {
        console.log(`\n   🌍 NO SPECIFIC DISTRIBUTOR TARGETING (all eligible distributors)`);
      }

      // Territory targeting
      const territoryCount =
        (offer.territories?.zones?.ids?.length || 0) +
        (offer.territories?.regions?.ids?.length || 0) +
        (offer.territories?.areas?.ids?.length || 0) +
        (offer.territories?.db_points?.ids?.length || 0);

      if (territoryCount > 0) {
        console.log(`\n   🗺️  TERRITORY TARGETING:`);
        if (offer.territories.zones?.ids?.length > 0) {
          console.log(
            `      Zones: ${offer.territories.zones.ids.length} (${offer.territories.zones.mode})`
          );
        }
        if (offer.territories.regions?.ids?.length > 0) {
          console.log(
            `      Regions: ${offer.territories.regions.ids.length} (${offer.territories.regions.mode})`
          );
        }
        if (offer.territories.areas?.ids?.length > 0) {
          console.log(
            `      Areas: ${offer.territories.areas.ids.length} (${offer.territories.areas.mode})`
          );
        }
        if (offer.territories.db_points?.ids?.length > 0) {
          console.log(
            `      DB Points: ${offer.territories.db_points.ids.length} (${offer.territories.db_points.mode})`
          );
        }
      } else {
        console.log(`\n   🌍 NO TERRITORY RESTRICTIONS (all territories)`);
      }

      console.log("\n" + "─".repeat(100));
    }

    // Test eligibility for a sample distributor
    console.log("\n\n🧪 TESTING ELIGIBILITY FOR SAMPLE DISTRIBUTORS:\n");
    const sampleDist = await Distributor.findOne({})
      .select("_id name mobile product_segment")
      .lean();

    if (sampleDist) {
      console.log(`Testing for: ${sampleDist.name} (${sampleDist.mobile})`);
      console.log(`Segment: ${sampleDist.product_segment.join(", ")}\n`);

      const eligibleOffers = await Offer.findEligibleForDistributor(sampleDist._id);
      console.log(`✅ ${eligibleOffers.length} offers are eligible for this distributor:`);
      eligibleOffers.forEach((o, i) => {
        console.log(`   ${i + 1}. ${o.name}`);
      });
    } else {
      console.log("⚠️  No distributors found in database");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n✅ Connection closed");
    process.exit(0);
  }
}

checkOfferEligibility();
