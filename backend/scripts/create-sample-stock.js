/**
 * Create sample stock data for testing
 * This simulates receiving goods from production
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function createSampleStock() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Get shabnamdpo's depot
    const user = await db.collection("users").findOne({ username: "shabnamdpo" });
    const employee = await db.collection("employees").findOne({ _id: user.employee_id });
    const depotId = employee.facility_id;

    console.log("📍 Target Depot:", depotId);
    console.log(`   Employee: ${employee.name}\n`);

    // Get a few products
    const products = await db.collection("products").find({}).limit(5).toArray();

    if (products.length === 0) {
      console.log("❌ No products found in database!");
      process.exit(1);
    }

    console.log(`📦 Creating stock for ${products.length} products...\n`);

    for (const product of products) {
      const qty = Math.floor(Math.random() * 50) + 10; // Random qty between 10-60

      // Create depot stock record
      await db.collection("depot_stocks").insertOne({
        depot_id: depotId,
        product_id: product._id,
        qty_ctn: mongoose.Types.Decimal128.fromString(qty.toString()),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Create incoming transaction
      await db.collection("depot_transactions_in").insertOne({
        depot_id: depotId,
        product_id: product._id,
        batch_no: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        production_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
        transaction_type: "from_production",
        qty_ctn: mongoose.Types.Decimal128.fromString(qty.toString()),
        balance_after_qty_ctn: mongoose.Types.Decimal128.fromString(qty.toString()),
        reference_type: "Manual",
        reference_no: `MANUAL-${Date.now()}`,
        location: "Default",
        transaction_date: new Date(),
        received_date: new Date(),
        status: "approved",
        notes: "Sample data for testing",
        created_by: user._id,
        approved_by: user._id,
        approved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log(`   ✅ ${product.sku} - ${qty} cartons`);
    }

    console.log(`\n✅ Sample stock data created successfully!`);
    console.log(`\nYou can now view local stock with shabnamdpo user.`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

createSampleStock();
