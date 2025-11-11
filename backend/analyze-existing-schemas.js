/**
 * Analyze Existing CustomerLedger and Collection Schemas
 */

const mongoose = require("mongoose");
const CustomerLedger = require("./src/models/CustomerLedger");
const Collection = require("./src/models/Collection");

const DB_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function analyzeSchemas() {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Analyze CustomerLedger
    console.log("📊 CustomerLedger Schema:");
    console.log("Fields:");
    console.log("  - distributor_id (ObjectId, ref: Distributor)");
    console.log("  - particulars (String)");
    console.log("  - transaction_date (Date)");
    console.log("  - voucher_type (String) - REQUIRED");
    console.log("  - voucher_no (String) - REQUIRED");
    console.log("  - debit (Number, default: 0)");
    console.log("  - credit (Number, default: 0)");
    console.log("  - note (String)");
    console.log("  - created_by, updated_by (ObjectId, ref: User)");
    console.log("  - created_at, updated_at (timestamps)\n");

    const ledgerCount = await CustomerLedger.countDocuments();
    console.log(`Total CustomerLedger entries: ${ledgerCount}`);

    if (ledgerCount > 0) {
      const sampleLedger = await CustomerLedger.findOne().lean();
      console.log("Sample entry:");
      console.log(JSON.stringify(sampleLedger, null, 2));
    }
    console.log("\n---\n");

    // Analyze Collection
    console.log("📊 Collection Schema:");
    console.log("Fields:");
    console.log("  - transaction_id (String, unique)");
    console.log("  - distributor_id (ObjectId, ref: Distributor)");
    console.log("  - do_no (String, optional)");
    console.log("  - payment_method (Bank | Cash)");
    console.log("  - company_bank, depositor_bank (ObjectId, ref: BdBank)");
    console.log("  - company_bank_account_no, depositor_branch (String)");
    console.log("  - cash_method (Petty Cash | Provision for...)");
    console.log("  - depositor_mobile (String)");
    console.log("  - deposit_amount (Decimal128)");
    console.log("  - deposit_date (Date)");
    console.log("  - note (String)");
    console.log("  - image (file_name, file_path, file_size, mime_type, uploaded_at)");
    console.log("  - created_by, updated_by (ObjectId, ref: User)");
    console.log("  - created_at, updated_at (timestamps)\n");

    const collectionCount = await Collection.countDocuments();
    console.log(`Total Collection entries: ${collectionCount}`);

    if (collectionCount > 0) {
      const sampleCollection = await Collection.findOne().lean();
      console.log("Sample entry:");
      console.log(JSON.stringify(sampleCollection, null, 2));
    }
    console.log("\n---\n");

    // Check voucher_type values
    const voucherTypes = await CustomerLedger.distinct("voucher_type");
    console.log("📋 Existing voucher_type values in CustomerLedger:");
    if (voucherTypes.length > 0) {
      voucherTypes.forEach((vt) => console.log(`  - ${vt}`));
    } else {
      console.log("  (none yet)");
    }
    console.log("\n");

    console.log("💡 Key Insights:");
    console.log("1. CustomerLedger uses voucher_type and voucher_no for transaction tracking");
    console.log("2. Collection has transaction_id (COL-YYYYMMDD-00001 format)");
    console.log("3. Collection.do_no is optional string field (for reference only)");
    console.log("4. When Collection approved → Create CustomerLedger entry with:");
    console.log('   - voucher_type: "Collection" or "Payment"');
    console.log("   - voucher_no: collection.transaction_id");
    console.log("   - credit: collection.deposit_amount (payment received)");
    console.log("   - particulars: Payment details");
    console.log("   - transaction_date: collection.deposit_date");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

analyzeSchemas();
