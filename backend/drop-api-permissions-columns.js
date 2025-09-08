/**
 * Drop Columns from api_permissions Collection
 * Pusti Happy Times - Remove unnecessary fields from api_permissions
 */

const mongoose = require("mongoose");
require("dotenv").config();

async function dropColumnsFromApiPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times"
    );
    console.log("✅ Connected to MongoDB");

    // Get the api_permissions collection directly
    const db = mongoose.connection.db;
    const collection = db.collection("api_permissions");

    // Remove the specified fields from all documents
    const result = await collection.updateMany(
      {}, // Match all documents
      {
        $unset: {
          description: "",
          method: "",
          endpoint: "",
          category: "",
          createdAt: "",
          updatedAt: "",
        },
      }
    );

    console.log(
      `🧹 Updated ${result.modifiedCount} documents in api_permissions collection`
    );
    console.log(
      "✅ Dropped columns: description, method, endpoint, category, createdAt, updatedAt"
    );

    // Show the updated documents
    const updatedDocs = await collection.find({}).toArray();
    console.log("\n📄 Updated api_permissions documents:");
    updatedDocs.forEach((doc) => {
      console.log(`  - ${doc.api_permissions} (ID: ${doc._id})`);
    });

    console.log("\n✅ Column drop operation completed successfully!");
  } catch (error) {
    console.error("❌ Error dropping columns from api_permissions:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔐 Database connection closed");
  }
}

// Run the operation
dropColumnsFromApiPermissions();
