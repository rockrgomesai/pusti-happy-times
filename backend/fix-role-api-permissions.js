require("dotenv").config();
const mongoose = require("mongoose");

async function fixRoleApiPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Find all entries where role_id or api_permission_id are strings
    const allEntries = await db.collection("role_api_permissions").find({}).toArray();

    let fixed = 0;
    for (const entry of allEntries) {
      const updates = {};

      // Check if role_id is a string
      if (typeof entry.role_id === "string") {
        updates.role_id = mongoose.Types.ObjectId.createFromHexString(entry.role_id);
      }

      // Check if api_permission_id is a string
      if (typeof entry.api_permission_id === "string") {
        updates.api_permission_id = mongoose.Types.ObjectId.createFromHexString(
          entry.api_permission_id
        );
      }

      // Update if needed
      if (Object.keys(updates).length > 0) {
        await db
          .collection("role_api_permissions")
          .updateOne({ _id: entry._id }, { $set: updates });
        console.log(`Fixed entry ${entry._id}`);
        fixed++;
      }
    }

    console.log(`\n✓ Fixed ${fixed} entries`);

    // Verify the Distributor demandorder:create entry
    const distributorEntry = await db.collection("role_api_permissions").findOne({
      role_id: mongoose.Types.ObjectId.createFromHexString("68be2193ea73210503fa3352"),
      api_permission_id: mongoose.Types.ObjectId.createFromHexString("690c3d5415b633edd80c48c8"),
    });

    console.log("\nVerification - Distributor demandorder:create:");
    console.log("  role_id type:", typeof distributorEntry?.role_id);
    console.log("  api_permission_id type:", typeof distributorEntry?.api_permission_id);

    await mongoose.disconnect();
    console.log("\n✓ Done!");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

fixRoleApiPermissions();
