const { MongoClient } = require("mongodb");

async function updateSuperAdminPassword() {
  const mongoURI =
    "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("pusti_happy_times");
    const usersCollection = db.collection("users");

    // Find the SuperAdmin user
    const superAdmin = await usersCollection.findOne({
      username: "SuperAdmin",
    });
    console.log("SuperAdmin found:", !!superAdmin);

    if (superAdmin) {
      console.log("Current password:", superAdmin.password);

      // Update the password to plain text "sadmin123"
      const result = await usersCollection.updateOne(
        { username: "SuperAdmin" },
        { $set: { password: "sadmin123" } }
      );

      console.log("Update result:", result);
      console.log("Modified count:", result.modifiedCount);

      // Verify the update
      const updatedUser = await usersCollection.findOne({
        username: "SuperAdmin",
      });
      console.log("New password:", updatedUser.password);
    } else {
      console.log("SuperAdmin user not found");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

updateSuperAdminPassword();
