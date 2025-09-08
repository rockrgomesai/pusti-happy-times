/**
 * Drop Columns from pg_permissions Collection
 * Pusti Happy Times - Remove unnecessary fields from pg_permissions
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function dropColumnsFromPgPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ Connected to MongoDB");

    // Get the pg_permissions collection directly
    const db = mongoose.connection.db;
    const collection = db.collection("pg_permissions");

    // Remove the specified fields from all documents
    const result = await collection.updateMany(
      {}, // Match all documents
      {
        $unset: {
          description: "",
          category: "",
          createdAt: "",
          updatedAt: "",
        },
      }
    );

    console.log(
      `🧹 Updated ${result.modifiedCount} documents in pg_permissions collection`
    );
    console.log(
      "✅ Dropped columns: description, category, createdAt, updatedAt"
    );

    // Show the updated documents
    const updatedDocs = await collection.find({}).toArray();
    console.log("\n📄 Updated pg_permissions documents:");
    updatedDocs.forEach((doc) => {
      console.log(`  - ${doc.pg_permissions} (ID: ${doc._id})`);
    });

    console.log("\n✅ Column drop operation completed successfully!");
  } catch (error) {
    console.error("❌ Error dropping columns from pg_permissions:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔐 Database connection closed");
  }
}

// Run the operation
dropColumnsFromPgPermissions();
