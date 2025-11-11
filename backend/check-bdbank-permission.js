const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkBdBankPermission() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check exact permission
    const exactMatch = await ApiPermission.findOne({ api_permissions: "bdbank:read" });
    console.log(
      "Exact match 'bdbank:read':",
      exactMatch ? `EXISTS (${exactMatch._id})` : "NOT FOUND"
    );

    // Check all collection permissions
    console.log("\n📋 All collection-related permissions:");
    const collectionPerms = await ApiPermission.find({
      api_permissions: /collection|bdbank|bank/i,
    });

    if (collectionPerms.length === 0) {
      console.log("   ❌ No collection-related permissions found");
    } else {
      collectionPerms.forEach((perm) => {
        console.log(`   - ${perm.api_permissions} (${perm._id})`);
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkBdBankPermission();
