#!/usr/bin/env node

const mongoose = require("mongoose");
require("dotenv").config();

const Offer = require("./src/models/Offer");
const { Distributor } = require("./src/models");

async function checkLatestOffer() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected\n");

    // Get the most recent offer
    const latestOffer = await Offer.findOne({}).sort({ createdAt: -1 }).lean();

    if (!latestOffer) {
      console.log("❌ No offers found in database");
      process.exit(0);
    }

    console.log("📦 LATEST OFFER:");
    console.log("═".repeat(100));
    console.log(`Name: ${latestOffer.name}`);
    console.log(`ID: ${latestOffer._id}`);
    console.log(`Type: ${latestOffer.offer_type}`);
    console.log(`Status: ${latestOffer.status} | Active: ${latestOffer.active}`);
    console.log(`Segments: ${latestOffer.product_segments.join(", ")}`);
    console.log(`Created: ${latestOffer.createdAt}`);
    console.log("");

    // Check distributor configuration
    console.log("🎯 DISTRIBUTOR TARGETING:");
    console.log("─".repeat(100));

    if (!latestOffer.distributors || !latestOffer.distributors.ids) {
      console.log("⚠️  NO DISTRIBUTOR DATA FOUND!");
      console.log("   distributors field:", JSON.stringify(latestOffer.distributors, null, 2));
    } else {
      console.log(`Mode: ${latestOffer.distributors.mode}`);
      console.log(`Total distributor IDs: ${latestOffer.distributors.ids.length}`);

      if (latestOffer.distributors.ids.length === 0) {
        console.log("⚠️  NO DISTRIBUTORS SELECTED (empty array)");
      } else {
        console.log(`\n✅ ${latestOffer.distributors.ids.length} distributors are targeted`);

        // Get first 10 distributors as sample
        const sampleIds = latestOffer.distributors.ids.slice(0, 10);
        const sampleDistributors = await Distributor.find({ _id: { $in: sampleIds } })
          .select("name mobile product_segment")
          .lean();

        console.log("\nSample distributors (first 10):");
        sampleDistributors.forEach((d, i) => {
          console.log(`   ${i + 1}. ${d.name} (${d.mobile}) - ${d.product_segment.join(", ")}`);
        });

        if (latestOffer.distributors.ids.length > 10) {
          console.log(`   ... and ${latestOffer.distributors.ids.length - 10} more`);
        }
      }
    }

    // Check territory configuration
    console.log("\n🗺️  TERRITORY TARGETING:");
    console.log("─".repeat(100));

    const territoryCount =
      (latestOffer.territories?.zones?.ids?.length || 0) +
      (latestOffer.territories?.regions?.ids?.length || 0) +
      (latestOffer.territories?.areas?.ids?.length || 0) +
      (latestOffer.territories?.db_points?.ids?.length || 0);

    if (territoryCount === 0) {
      console.log("⚠️  NO TERRITORIES SELECTED");
    } else {
      if (latestOffer.territories.zones?.ids?.length > 0) {
        console.log(
          `   Zones: ${latestOffer.territories.zones.ids.length} (${latestOffer.territories.zones.mode})`
        );
      }
      if (latestOffer.territories.regions?.ids?.length > 0) {
        console.log(
          `   Regions: ${latestOffer.territories.regions.ids.length} (${latestOffer.territories.regions.mode})`
        );
      }
      if (latestOffer.territories.areas?.ids?.length > 0) {
        console.log(
          `   Areas: ${latestOffer.territories.areas.ids.length} (${latestOffer.territories.areas.mode})`
        );
      }
      if (latestOffer.territories.db_points?.ids?.length > 0) {
        console.log(
          `   DB Points: ${latestOffer.territories.db_points.ids.length} (${latestOffer.territories.db_points.mode})`
        );
      }
    }

    console.log("\n" + "═".repeat(100));

    // Test eligibility for first distributor
    if (latestOffer.distributors?.ids?.length > 0) {
      console.log("\n🧪 TESTING ELIGIBILITY:");
      const firstDistId = latestOffer.distributors.ids[0];
      const firstDist = await Distributor.findById(firstDistId)
        .select("name mobile product_segment")
        .lean();

      if (firstDist) {
        console.log(`Testing for: ${firstDist.name} (${firstDist.mobile})`);
        console.log(
          `This distributor should see the offer: ${latestOffer.distributors.mode === "include" ? "YES ✅" : "NO ❌ (excluded)"}`
        );

        // Actually test eligibility
        const eligibleOffers = await Offer.findEligibleForDistributor(firstDistId);
        const isEligible = eligibleOffers.some(
          (o) => o._id.toString() === latestOffer._id.toString()
        );

        console.log(
          `Actual eligibility check result: ${isEligible ? "ELIGIBLE ✅" : "NOT ELIGIBLE ❌"}`
        );

        if (!isEligible && latestOffer.distributors.mode === "include") {
          console.log("\n⚠️  WARNING: Distributor is in the list but NOT eligible!");
          console.log("   This may be due to:");
          console.log("   - Territory mismatch");
          console.log("   - Product segment mismatch");
          console.log("   - Offer dates (start/end)");
          console.log("   - Offer status or active flag");
        }
      }
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

checkLatestOffer();
