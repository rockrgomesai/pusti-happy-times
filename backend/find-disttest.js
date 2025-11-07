const mongoose = require("mongoose");
const User = require("./src/models/User");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function findDisttest() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const user = await User.findOne({ username: "disttest" })
      .select("username distributor_id")
      .lean();

    if (user) {
      console.log("\nFound user:");
      console.log(`  Username: ${user.username}`);
      console.log(`  Distributor ID: ${user.distributor_id}`);
      console.log(`  ID as string: ${user.distributor_id.toString()}`);
    } else {
      console.log("\nUser 'disttest' not found");
    }

    await mongoose.connection.close();
    console.log("\nDone!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

findDisttest();
