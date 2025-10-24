require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixAllPasswords() {
  try {
    await mongoose.connect(uri);
    console.log("✅ Connected\n");

    const db = mongoose.connection.db;

    // Find all non-superadmin users
    const users = await db
      .collection("users")
      .find({
        username: { $ne: "superadmin" },
      })
      .toArray();

    console.log(`Found ${users.length} users to check\n`);

    const testPassword = "password123";
    let fixed = 0;
    let alreadyOk = 0;

    for (const user of users) {
      const isMatch = await bcrypt.compare(testPassword, user.password);

      if (!isMatch) {
        console.log(`❌ ${user.username} - password mismatch, fixing...`);
        const newHash = await bcrypt.hash(testPassword, 10);
        await db.collection("users").updateOne({ _id: user._id }, { $set: { password: newHash } });
        fixed++;
      } else {
        console.log(`✅ ${user.username} - password OK`);
        alreadyOk++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Already OK: ${alreadyOk}`);
    console.log(`  Total: ${users.length}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

fixAllPasswords();
