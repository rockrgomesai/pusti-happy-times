/**
 * DSR Delivery Test Seed Script
 *
 * Seeds data for testing the DSR Delivery mobile panel.
 *
 * Creates:
 *  - DSR model record (DSR-TEST-01) linked to Distributor-0001
 *  - DSR user (dsrtest01 / password123) with role DSR
 *  - Route RT-DSR-TEST-01 linked to Distributor-0001
 *  - 6 VERIFIED outlets on that route
 *  - DistributorStock for 3 products (200 units each)
 *  - 5 SecondaryOrders today: 3 × Approved, 2 × Hold
 *  - 1 prior Delivered order (yesterday) on outlet-1 with credit_balance_after: 1500
 *
 * Usage:
 *   cd backend && node seed-dsr-test.js
 *
 * Test logins after seeding:
 *   distapple / password123  → Distributor-owner (Distributor-0001)
 *   dsrtest01 / password123  → DSR delivery panel
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URI_LOCAL ||
    "mongodb://admin:password123@localhost:27019/pusti_happy_times?authSource=admin";

// ─── Lean models (strict: false avoids validation blockers) ────────────────
const leanModel = (name, collection) =>
    mongoose.model(name, new mongoose.Schema({}, { strict: false, timestamps: true }), collection);

// We load the real DistributorStock & SecondaryOrder models for methods/statics.
const DistributorStock = require("./src/models/DistributorStock");
const SecondaryOrder = require("./src/models/SecondaryOrder");

async function run() {
    console.log("🔌 Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // ─── Bootstrap lean model references ──────────────────────────────────────
    const Distributor = leanModel("Distributor_seed", "distributors");
    const User = leanModel("User_seed", "users");
    const Role = leanModel("Role_seed", "roles");
    const Product = leanModel("Product_seed", "products");
    const OutletType = leanModel("OutletType_seed", "outlet_types");
    const Channel = leanModel("Channel_seed", "channels");
    const DSR = leanModel("DSR_seed", "dsrs");
    const Outlet = leanModel("Outlet_seed", "outlets");

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1 — Bootstrap: resolve required references
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("── Phase 1: Resolving references ─────────────────────────────");

    const distapple = await User.findOne({ username: "distapple" }).lean();
    if (!distapple) throw new Error("distapple user not found. Run main seed first.");
    console.log("✅ distapple user:", distapple._id);

    if (!distapple.distributor_id) throw new Error("distapple user has no distributor_id set.");
    const distributor = await Distributor.findById(distapple.distributor_id).lean();
    if (!distributor) throw new Error("Distributor linked to distapple not found.");
    console.log(`✅ Distributor (${distributor.name}):`, distributor._id);

    const dsrRole = await Role.findOne({ role: "DSR" }).lean();
    if (!dsrRole) throw new Error('Role "DSR" not found. Ensure roles are seeded.');
    console.log("✅ DSR role:", dsrRole._id);

    // Grab 3 active products with a trade price
    const products = await Product.find({ active: true, trade_price: { $gt: 0 } })
        .select("_id sku english_name trade_price")
        .limit(3)
        .lean();
    if (products.length === 0) throw new Error("No active products found.");
    console.log(`✅ Products (${products.length}):`, products.map((p) => p.sku).join(", "));

    // OutletType & Channel (first active, if any)
    const outletType = await OutletType.findOne({ active: true }).lean();
    const channel = await Channel.findOne({ active: true }).lean();

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2 — DSR record + user
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n── Phase 2: DSR record & user ────────────────────────────────");

    let dsrRecord = await DSR.findOne({ dsr_code: "DSR-TEST-01" }).lean();
    if (!dsrRecord) {
        const created = await DSR.create({
            dsr_code: "DSR-TEST-01",
            name: "Test DSR One",
            distributor_id: distributor._id,
            mobile: "01700000099",
            email: "dsr.test01@test.local",
            active: true,
        });
        dsrRecord = created.toObject();
        console.log("✅ Created DSR record DSR-TEST-01:", dsrRecord._id);
    } else {
        console.log("ℹ️  DSR-TEST-01 already exists:", dsrRecord._id);
    }

    // Upsert DSR user
    const hashedPw = await bcrypt.hash("password123", 10);
    let dsrUser = await User.findOne({ username: "dsrtest01" }).lean();
    if (!dsrUser) {
        const created = await db.collection("users").insertOne({
            username: "dsrtest01",
            password: hashedPw,
            role_id: dsrRole._id,
            email: "dsrtest01@test.local",
            active: true,
            user_type: "distributor",
            distributor_id: distributor._id,
            dsr_id: dsrRecord._id,
            name: "Test DSR One",
            created_at: new Date(),
            updated_at: new Date(),
        });
        console.log("✅ Created user dsrtest01:", created.insertedId);
        dsrUser = await User.findOne({ username: "dsrtest01" }).lean();
    } else {
        console.log("ℹ️  User dsrtest01 already exists:", dsrUser._id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 3 — Route
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n── Phase 3: Route ────────────────────────────────────────────");

    // Try to find an existing route for this distributor first
    let route = await db.collection("routes").findOne({
        $or: [{ route_id: "RT-DSR-TEST-01" }, { distributor_id: distributor._id }],
    });

    if (!route || route.route_id !== "RT-DSR-TEST-01") {
        // Find any territory to satisfy required area_id / db_point_id
        const anyTerritory = await db.collection("territories").findOne({});
        const areaId = anyTerritory ? anyTerritory._id : new mongoose.Types.ObjectId();
        const dbPointId = anyTerritory ? anyTerritory._id : new mongoose.Types.ObjectId();

        const existing = await db.collection("routes").findOne({ route_id: "RT-DSR-TEST-01" });
        if (!existing) {
            const result = await db.collection("routes").insertOne({
                route_id: "RT-DSR-TEST-01",
                route_name: "DSR Test Route",
                area_id: areaId,
                db_point_id: dbPointId,
                distributor_id: distributor._id,
                outlet_ids: [],
                frequency: 0,
                contribution: 0,
                active: true,
                created_at: new Date(),
                updated_at: new Date(),
            });
            route = await db.collection("routes").findOne({ _id: result.insertedId });
            console.log("✅ Created route RT-DSR-TEST-01:", route._id);
        } else {
            route = existing;
            console.log("ℹ️  Route RT-DSR-TEST-01 already exists:", route._id);
        }
    } else if (route.route_id === "RT-DSR-TEST-01") {
        console.log("ℹ️  Route RT-DSR-TEST-01 already exists:", route._id);
    } else {
        console.log("ℹ️  Using existing route:", route.route_id, route._id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 4 — Outlets
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n── Phase 4: Outlets ──────────────────────────────────────────");

    const outletDefs = [
        { outlet_id: "OUT-DSR-TEST-001", name: "Test Shop Alpha", lat: 23.7505, lng: 90.3919 },
        { outlet_id: "OUT-DSR-TEST-002", name: "Test Shop Beta", lat: 23.7510, lng: 90.3925 },
        { outlet_id: "OUT-DSR-TEST-003", name: "Test Shop Gamma", lat: 23.7515, lng: 90.3930 },
        { outlet_id: "OUT-DSR-TEST-004", name: "Test Shop Delta", lat: 23.7520, lng: 90.3935 },
        { outlet_id: "OUT-DSR-TEST-005", name: "Test Shop Epsilon", lat: 23.7525, lng: 90.3940 },
        { outlet_id: "OUT-DSR-TEST-006", name: "Test Shop Zeta", lat: 23.7530, lng: 90.3945 },
    ];

    const outletIds = [];
    for (const def of outletDefs) {
        const existing = await db.collection("outlets").findOne({ outlet_id: def.outlet_id });
        if (existing) {
            console.log(`ℹ️  Outlet ${def.outlet_id} already exists`);
            outletIds.push(existing._id);
        } else {
            const result = await db.collection("outlets").insertOne({
                outlet_id: def.outlet_id,
                outlet_name: def.name,
                route_id: route._id,
                distributor_id: distributor._id,
                outlet_type_id: outletType?._id || null,
                channel_id: channel?._id || null,
                lati: def.lat,
                longi: def.lng,
                address: `Kawran Bazar, Dhaka (Seed)`,
                phone: "01700000000",
                contact_person: "Test Contact",
                verification_status: "VERIFIED",
                active: true,
                created_at: new Date(),
                updated_at: new Date(),
            });
            outletIds.push(result.insertedId);
            console.log(`✅ Created outlet ${def.outlet_id}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 5 — Update Route.outlet_ids
    // ═══════════════════════════════════════════════════════════════════════════
    await db.collection("routes").updateOne(
        { _id: route._id },
        { $addToSet: { outlet_ids: { $each: outletIds } }, $set: { updated_at: new Date() } }
    );
    console.log("\n✅ Route outlet_ids updated");

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 6 — Distributor Stock (FIFO)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n── Phase 6: Distributor Stock ────────────────────────────────");

    for (const product of products) {
        let stock = await DistributorStock.findOne({
            distributor_id: distributor._id,
            sku: product.sku.toUpperCase(),
        });

        if (!stock) {
            stock = new DistributorStock({
                distributor_id: distributor._id,
                sku: product.sku.toUpperCase(),
                qty: 0,
                batches: [],
            });
        }

        if (parseFloat(stock.qty) < 200) {
            const toAdd = 200 - parseFloat(stock.qty);
            stock.addStockFIFO(toAdd, product.trade_price || 50);
            await stock.save();
            console.log(`✅ Stock for ${product.sku}: qty=${parseFloat(stock.qty)}`);
        } else {
            console.log(`ℹ️  Stock for ${product.sku} already ≥200 (qty=${parseFloat(stock.qty)})`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 7 — Secondary Orders
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n── Phase 7: Secondary Orders ─────────────────────────────────");

    const today = new Date();
    today.setHours(8, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Helper to build items from products
    const buildItems = (qty = 5) =>
        products.map((p) => ({
            product_id: p._id,
            sku: p.sku.toUpperCase(),
            quantity: qty,
            unit_price: p.trade_price || 50,
            subtotal: qty * (p.trade_price || 50),
        }));

    const orderSpecs = [
        { outlet: outletIds[0], status: "Approved", date: today, holdReason: null },
        { outlet: outletIds[1], status: "Approved", date: today, holdReason: null },
        { outlet: outletIds[2], status: "Approved", date: today, holdReason: null },
        { outlet: outletIds[3], status: "Hold", date: today, holdReason: "Customer not available" },
        { outlet: outletIds[4], status: "Hold", date: today, holdReason: "Road blocked" },
    ];

    for (let i = 0; i < orderSpecs.length; i++) {
        const spec = orderSpecs[i];
        const order_number = `SO-DSR-TEST-${String(i + 1).padStart(3, "0")}`;

        const exists = await SecondaryOrder.findOne({ order_number });
        if (exists) {
            console.log(`ℹ️  Order ${order_number} already exists (status: ${exists.order_status})`);
            continue;
        }

        const items = buildItems(5);
        const total = items.reduce((s, it) => s + it.subtotal, 0);

        const doc = {
            order_number,
            outlet_id: spec.outlet,
            distributor_id: distributor._id,
            dsr_id: dsrUser._id,
            route_id: route._id,
            order_date: spec.date,
            items,
            subtotal: total,
            discount_amount: 0,
            total_amount: total,
            order_status: spec.status,
            approved_by: distapple._id,
            approved_at: spec.date,
            entry_mode: "manual",
            gps_location: { type: "Point", coordinates: [90.3919, 23.7505] },
        };

        if (spec.status === "Hold") {
            doc.hold_reason = spec.holdReason;
        }

        await SecondaryOrder.create(doc);
        console.log(`✅ Order ${order_number} created (${spec.status})`);
    }

    // ─── Prior delivered order for outlet-1 (credit test) ─────────────────────
    const priorOrderNumber = "SO-DSR-TEST-PRIOR-001";
    const priorExists = await SecondaryOrder.findOne({ order_number: priorOrderNumber });
    if (!priorExists) {
        const items = buildItems(3);
        const total = items.reduce((s, it) => s + it.subtotal, 0);
        await SecondaryOrder.create({
            order_number: priorOrderNumber,
            outlet_id: outletIds[0],
            distributor_id: distributor._id,
            dsr_id: dsrUser._id,
            route_id: route._id,
            order_date: yesterday,
            items,
            subtotal: total,
            discount_amount: 0,
            total_amount: total,
            order_status: "Delivered",
            approved_by: distapple._id,
            approved_at: yesterday,
            delivered_by: distapple._id,
            delivered_at: yesterday,
            cash_collected: total - 1500,
            payable_amount: total,
            credit_balance_before: 0,
            credit_balance_after: 1500,
            entry_mode: "manual",
            gps_location: { type: "Point", coordinates: [90.3919, 23.7505] },
        });
        console.log(`✅ Prior delivered order ${priorOrderNumber} created (credit_balance_after: 1500)`);
    } else {
        console.log(`ℹ️  Prior order ${priorOrderNumber} already exists`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Seed complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("Test logins:");
    console.log("  distapple  / password123  → Distributor owner (Distributor-0001)");
    console.log("  dsrtest01  / password123  → DSR delivery panel\n");
    console.log("Route:   RT-DSR-TEST-01  (6 VERIFIED outlets)");
    console.log("Orders:  3 × Approved, 2 × Hold, 1 × Delivered (credit: 1500)");
    console.log("Stock:   3 products × 200 units each\n");

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Seed failed:", err.message || err);
    process.exit(1);
});
