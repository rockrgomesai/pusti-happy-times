/**
 * Seed Bangladesh Banks Collection
 * Run: node seed-bd-banks.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

const bdBankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    short_name: {
      type: String,
      trim: true,
    },
    bank_code: {
      type: String,
      trim: true,
      sparse: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: "bd_banks",
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const BdBank = mongoose.model("BdBank", bdBankSchema);

const banks = [
  "AB Bank Ltd.",
  "Agrani Bank",
  "Al-Arafah Islami Bank Ltd.",
  "Ansar VDP Unnayan Bank",
  "BASIC Bank",
  "BRAC Bank Ltd.",
  "Bangladesh Commerce Bank Ltd.",
  "Bangladesh Development Bank",
  "Bangladesh Krishi Bank",
  "Bank Al-Falah",
  "Bank Asia Ltd.",
  "CITI Bank NA",
  "Commercial Bank of Ceylon",
  "Community Bank Bangladesh Limited",
  "Dhaka Bank Ltd.",
  "Dutch Bangla Bank Ltd.",
  "EXIM Bank Ltd.",
  "Eastern Bank Ltd.",
  "First Security Islami Bank Ltd.",
  "Global Islamic Bank Ltd.",
  "Grameen Bank",
  "HSBC",
  "Habib Bank Ltd.",
  "ICB Islamic Bank",
  "IFIC Bank Ltd.",
  "Islami Bank Bangladesh Ltd.",
  "Jamuna Bank Ltd.",
  "Janata Bank",
  "Jubilee Bank",
  "Karmashangosthan Bank",
  "Meghna Bank Ltd.",
  "Mercantile Bank Ltd.",
  "Midland Bank Ltd.",
  "Modhumoti Bank Ltd.",
  "Mutual Trust Bank Ltd.",
  "NCC Bank Ltd.",
  "NRB Bank Ltd.",
  "NRB Commercial Bank Ltd.",
  "National Bank Ltd.",
  "National Bank of Pakistan",
  "One Bank Ltd.",
  "Padma Bank Ltd.",
  "Palli Sanchay Bank",
  "Premier Bank Ltd.",
  "Prime Bank Ltd.",
  "Pubali Bank Ltd.",
  "Rajshahi Krishi Unnayan Bank",
  "Rupali Bank",
  "SBAC Bank Ltd.",
  "Shahjalal Islami Bank Ltd.",
  "Shimanto Bank Ltd.",
  "Social Islami Bank Ltd.",
  "Sonali Bank",
  "Southeast Bank Ltd.",
  "Standard Bank Ltd.",
  "Standard Chartered Bank",
  "State Bank of India",
  "The City Bank Ltd.",
  "Trust Bank Ltd.",
  "Union Bank Ltd.",
  "United Commercial Bank Ltd.",
  "Uttara Bank Ltd.",
  "Woori Bank Ltd.",
];

async function seedBanks() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Clear existing banks
    const deleteResult = await BdBank.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing banks\n`);

    // Prepare bank documents
    const bankDocs = banks.map((name) => {
      // Generate short name (remove Ltd., Bank, etc.)
      let shortName = name
        .replace(/Ltd\./gi, "")
        .replace(/Limited/gi, "")
        .replace(/Bank/gi, "")
        .trim();

      return {
        name: name,
        short_name: shortName || name,
        active: true,
      };
    });

    // Insert banks
    const result = await BdBank.insertMany(bankDocs);
    console.log(`✅ Inserted ${result.length} banks\n`);

    // Display summary
    console.log("📊 Summary:");
    console.log(`   Total banks: ${result.length}`);
    console.log("\n📋 Sample banks:");
    result.slice(0, 5).forEach((bank) => {
      console.log(`   - ${bank.name} (${bank.short_name})`);
    });
    console.log(`   ... and ${result.length - 5} more`);

    // Verify
    const count = await BdBank.countDocuments();
    console.log(`\n✅ Verification: ${count} banks in database`);

    console.log("\n✨ Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding banks:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the seeder
seedBanks();
