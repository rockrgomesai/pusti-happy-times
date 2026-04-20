/**
 * Seed synthetic SecondaryOffers for the test SO's route.
 *
 * Creates a handful of active offers eligible for every outlet on a route,
 * pre-populating `resolvedOutlets` so the `/mobile/catalog/offers` endpoint
 * returns them without having to run full targeting resolution.
 *
 * Usage:
 *   node scripts/seed-secondary-offers.js
 *   node scripts/seed-secondary-offers.js --route=R1-DPBEV1-D1 --reset
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

const args = process.argv.slice(2).reduce((acc, a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) acc[m[1]] = m[2] === undefined ? true : m[2];
    return acc;
}, {});
const ROUTE_ID = args.route || "R1-DPBEV1-D1";
const RESET = !!args.reset;

async function main() {
    if (!MONGODB_URI) throw new Error("MONGODB_URI not set");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB:", MONGODB_URI.split("@")[1]?.split("?")[0]);

    const Route = require("../src/models/Route");
    const SecondaryOffer = require("../src/models/SecondaryOffer");

    const route = await Route.findOne({ route_id: ROUTE_ID }).lean();
    if (!route) throw new Error(`Route ${ROUTE_ID} not found`);
    const outletIds = route.outlet_ids || [];
    const distributorId = route.distributor_id?._id || route.distributor_id;
    console.log(`Route ${route.route_id}: ${outletIds.length} outlets, distributor=${distributorId}`);

    if (RESET) {
        const del = await SecondaryOffer.deleteMany({ name: { $regex: /^\[DEV\]/ } });
        console.log(`Removed ${del.deletedCount} previous [DEV] offers`);
    }

    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const offers = [
        {
            name: "[DEV] 10% off orders ≥ 500 BDT",
            offer_type: "FLAT_DISCOUNT_PCT",
            product_segments: ["BIS", "BEV"],
            description: "Flat 10% off when you order 500 BDT or more.",
            config: {
                applyToAllProducts: true,
                discountPercentage: 10,
                minOrderValue: 500,
                maxDiscountAmount: 300,
            },
        },
        {
            name: "[DEV] Flat 50 BDT off orders ≥ 1000 BDT",
            offer_type: "FLAT_DISCOUNT_AMT",
            product_segments: ["BIS", "BEV"],
            description: "Save 50 BDT on orders above 1000 BDT.",
            config: {
                applyToAllProducts: true,
                discountAmount: 50,
                minOrderValue: 1000,
            },
        },
        {
            name: "[DEV] Slab Discount (500/1000/2000)",
            offer_type: "DISCOUNT_SLAB_PCT",
            product_segments: ["BIS", "BEV"],
            description: "Tiered discount: 5% / 8% / 12% as basket grows.",
            config: {
                applyToAllProducts: true,
                slabs: [
                    { minValue: 500, maxValue: 999, discountPercentage: 5 },
                    { minValue: 1000, maxValue: 1999, discountPercentage: 8 },
                    { minValue: 2000, maxValue: 999999, discountPercentage: 12 },
                ],
            },
        },
        {
            name: "[DEV] 3% Cashback",
            offer_type: "CASHBACK",
            product_segments: ["BIS", "BEV"],
            description: "Earn 3% cashback on every order (max 200 BDT).",
            config: {
                applyToAllProducts: true,
                cashbackPercentage: 3,
                maxCashback: 200,
            },
        },
    ];

    let created = 0;
    for (const o of offers) {
        const existing = await SecondaryOffer.findOne({ name: o.name });
        if (existing) {
            console.log(`  = ${o.name} (exists)`);
            // Ensure resolvedOutlets are current
            await SecondaryOffer.updateOne(
                { _id: existing._id },
                {
                    $set: {
                        resolvedOutlets: outletIds,
                        active: true,
                        status: "Active",
                        start_date: yesterday,
                        end_date: in30,
                        "targeting.distributors": { ids: [distributorId], mode: "include", applyToAllRoutes: true },
                        "outlets.selectionMode": "specific",
                        "outlets.ids": outletIds,
                        "outlets.mode": "include",
                    },
                }
            );
            continue;
        }

        const doc = new SecondaryOffer({
            ...o,
            start_date: yesterday,
            end_date: in30,
            status: "Active",
            active: true,
            targeting: {
                distributors: { ids: [distributorId], mode: "include", applyToAllRoutes: true },
            },
            outlets: {
                selectionMode: "specific",
                ids: outletIds,
                mode: "include",
            },
            // Pre-populate to skip full resolution logic
            resolvedOutlets: outletIds,
        });
        await doc.save();
        created++;
        console.log(`  + ${o.name}`);
    }

    const total = await SecondaryOffer.countDocuments({
        active: true,
        status: "Active",
        resolvedOutlets: outletIds[0],
    });
    console.log(`\n✅ Done. Created ${created} new offers. Active offers covering outlet[0]: ${total}`);

    await mongoose.connection.close();
}

main().catch(async (err) => {
    console.error("❌", err);
    try {
        await mongoose.connection.close();
    } catch (_) { }
    process.exit(1);
});
