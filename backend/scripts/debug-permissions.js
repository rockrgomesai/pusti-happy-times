/**
 * Debug API Permissions Collection
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

async function debugPermissions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully\n");

    const Perm = mongoose.model(
      "Perm",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );

    // Get total count
    const total = await Perm.countDocuments({});
    console.log(`Total API permissions: ${total}\n`);

    // Get one sample document to see structure
    const sample = await Perm.findOne({});
    if (sample) {
      console.log("Sample permission document structure:");
      console.log(JSON.stringify(sample.toObject(), null, 2));
      console.log("\n");
    }

    // Search for outlets permissions
    console.log("Searching for outlets permissions...\n");
    const outletsPerms = await Perm.find({ api_permissions: /outlets/ });
    console.log(`Found ${outletsPerms.length} outlets permissions:`);
    outletsPerms.forEach((p) => {
      console.log(`  - ${p.api_permissions}: ${p.description || "No description"}`);
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

debugPermissions();
