/**
 * Seed script — SO test user + synthetic DistributorStock data
 *
 * What it does:
 *   1. Finds (or creates) an Employee record for a test SO.
 *   2. Creates a User (user_type=employee, role=SO) linked to that Employee.
 *   3. Assigns the SO to a route (default: R1-DPBEV1-D1) on all 7 visit days.
 *   4. Seeds the route's Distributor with synthetic DistributorStock records
 *      (random batches, FIFO-compatible) across a sample of active products.
 *
 * Idempotent: safe to re-run. Skips already-existing user/employee.
 * Stock seeding will ADD new batches each run — pass --reset to clear first.
 *
 * Usage:
 *   node scripts/seed-so-user-and-stocks.js
 *   node scripts/seed-so-user-and-stocks.js --username=so_test --password=Test@1234 \
 *       --route=R1-DPBEV1-D1 --products=40 --reset
 */

const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

// ---------- CLI arg parsing ----------
const args = process.argv.slice(2).reduce((acc, a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) acc[m[1]] = m[2] === undefined ? true : m[2];
    return acc;
}, {});

const USERNAME = args.username || "so_test";
const PASSWORD = args.password || "Test@1234";
const ROUTE_ID = args.route || "R1-DPBEV1-D1";
const PRODUCT_COUNT = parseInt(args.products || "40", 10);
const RESET_STOCK = !!args.reset;

// ---------- helpers ----------
function rand(min, max) {
    return Math.random() * (max - min) + min;
}
function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}
function makeBatchId() {
    const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").substring(0, 14);
    const rnd = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${ts}-${rnd}`;
}

// ---------- main ----------
async function main() {
    if (!MONGODB_URI) throw new Error("MONGODB_URI not set in backend/.env");

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB:", MONGODB_URI.split("@")[1]?.split("?")[0]);

    const User = require("../src/models/User");
    const Role = require("../src/models/Role");
    const Route = require("../src/models/Route");
    const Distributor = require("../src/models/Distributor");
    const Product = require("../src/models/Product");
    const DistributorStock = require("../src/models/DistributorStock");

    // 1) Target route
    const route = await Route.findOne({ route_id: ROUTE_ID });
    if (!route) throw new Error(`Route '${ROUTE_ID}' not found`);
    console.log(`\n[1/5] Route: ${route.route_id} (${route._id}) distributor=${route.distributor_id}`);

    // 2) SO role
    const soRole = await Role.findOne({ role: "SO" });
    if (!soRole) throw new Error("Role 'SO' not found");

    // 3) Employee (find-or-create — use raw driver to bypass strict validation)
    const db = mongoose.connection.db;
    const employeesCol = db.collection("employees");
    const employeeKey = `SO_TEST_${USERNAME.toUpperCase()}`;
    let empDoc = await employeesCol.findOne({ employee_id: employeeKey });
    if (!empDoc) {
        const res = await employeesCol.insertOne({
            employee_id: employeeKey,
            name: `Test SO (${USERNAME})`,
            designation_id: null,
            created_at: new Date(),
            updated_at: new Date(),
        });
        empDoc = await employeesCol.findOne({ _id: res.insertedId });
        console.log(`[2/5] Employee created: ${empDoc._id} (${empDoc.employee_id})`);
    } else {
        console.log(`[2/5] Employee reused: ${empDoc._id} (${empDoc.employee_id})`);
    }

    // 4) User (find-or-upsert). Use raw insert to bypass super-strict audit validation;
    //    hash password manually.
    const usersCol = db.collection("users");
    let userDoc = await usersCol.findOne({ username: USERNAME });
    const hashed = await bcrypt.hash(PASSWORD, 10);
    if (!userDoc) {
        const systemUser = await usersCol.findOne({ username: "superadmin" });
        const createdBy = systemUser ? systemUser._id : new mongoose.Types.ObjectId();
        const res = await usersCol.insertOne({
            username: USERNAME,
            password: hashed,
            role_id: soRole._id,
            email: `${USERNAME}@example.local`,
            active: true,
            user_type: "employee",
            employee_id: empDoc._id,
            distributor_id: null,
            tokenVersion: 0,
            created_at: new Date(),
            created_by: createdBy,
            updated_at: new Date(),
            updated_by: createdBy,
        });
        userDoc = await usersCol.findOne({ _id: res.insertedId });
        console.log(`[3/5] User created: ${userDoc.username} (${userDoc._id})`);
    } else {
        await usersCol.updateOne(
            { _id: userDoc._id },
            { $set: { password: hashed, active: true, role_id: soRole._id, employee_id: empDoc._id, updated_at: new Date() } }
        );
        console.log(`[3/5] User updated: ${userDoc.username} (${userDoc._id}) — password reset`);
    }

    // 5) Assign route to this SO (raw update to avoid legacy-doc validation issues)
    const routesCol = db.collection("routes");
    const sr1Taken = route.sr_assignments?.sr_1?.sr_id && String(route.sr_assignments.sr_1.sr_id) !== String(empDoc._id);
    const slot = sr1Taken ? "sr_2" : "sr_1";
    await routesCol.updateOne(
        { _id: route._id },
        {
            $set: {
                [`sr_assignments.${slot}`]: {
                    sr_id: empDoc._id, // NOTE: /routes/my-route matches against Employee._id, not User._id
                    visit_days: ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"],
                },
            },
        }
    );
    console.log(`[4/5] Route ${route.route_id}: ${slot} assigned to ${USERNAME} (all days)`);

    // 6) Distributor stock
    const distributorId = route.distributor_id;
    if (RESET_STOCK) {
        const delRes = await DistributorStock.deleteMany({ distributor_id: distributorId });
        console.log(`      Cleared ${delRes.deletedCount} existing stock rows for distributor`);
    }

    const products = await Product.aggregate([
        { $match: { active: true, sku: { $exists: true, $ne: null } } },
        { $sample: { size: PRODUCT_COUNT } },
    ]);
    console.log(`[5/5] Seeding stock for ${products.length} products…`);

    let upserts = 0;
    for (const p of products) {
        const sku = String(p.sku).toUpperCase();
        const basePrice = Number(p.db_price || p.trade_price || 100);
        const batchCount = randInt(1, 3);
        const batches = [];
        let totalQty = 0;
        for (let i = 0; i < batchCount; i++) {
            const q = randInt(50, 400);
            const price = +(basePrice * rand(0.95, 1.05)).toFixed(2);
            // Stagger received dates over last 30 days so FIFO ordering is realistic
            const daysAgo = randInt(0, 30);
            const received = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            batches.push({
                batch_id: makeBatchId() + `-${i}`,
                qty: mongoose.Types.Decimal128.fromString(String(q)),
                unit_price: mongoose.Types.Decimal128.fromString(String(price)),
                received_at: received,
            });
            totalQty += q;
        }
        batches.sort((a, b) => a.received_at - b.received_at);

        await DistributorStock.updateOne(
            { distributor_id: distributorId, sku },
            {
                $setOnInsert: { distributor_id: distributorId, sku },
                $push: { batches: { $each: batches } },
                $inc: { qty: totalQty },
                $set: { last_received_at: batches[batches.length - 1].received_at },
            },
            { upsert: true }
        );
        upserts++;
    }
    console.log(`      Upserted ${upserts} DistributorStock rows`);

    // Summary
    const totalStock = await DistributorStock.countDocuments({ distributor_id: distributorId });
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Done");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Login username : ${USERNAME}`);
    console.log(`  Login password : ${PASSWORD}`);
    console.log(`  Role           : SO`);
    console.log(`  Employee       : ${empDoc.employee_id} (${empDoc._id})`);
    console.log(`  Route          : ${route.route_id} on slot ${slot}, ALL days`);
    console.log(`  Distributor    : ${distributorId}`);
    console.log(`  Stock rows     : ${totalStock} (distributor total)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.connection.close();
}

main().catch(async (err) => {
    console.error("\n❌ Seed failed:", err);
    try {
        await mongoose.connection.close();
    } catch (_) { }
    process.exit(1);
});
