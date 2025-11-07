const mongoose = require("mongoose");

async function checkRoles() {
  try {
    await mongoose.connect(
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin"
    );
    console.log("Connected to MongoDB\n");

    // Query roles collection directly
    const rolesCollection = mongoose.connection.collection("roles");
    const roles = await rolesCollection.find({}).limit(10).toArray();

    console.log("Roles from collection:");
    console.log(JSON.stringify(roles, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDisconnected from MongoDB");
  }
}

checkRoles();
