const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    const db = mongoose.connection.db;

    // Check users with distributor role
    const users = await db
      .collection("users")
      .find({
        role_name: "Distributor",
      })
      .limit(5)
      .toArray();

    console.log(`Found ${users.length} distributor users:`);
    users.forEach((u) => {
      console.log(`- ${u.username} (${u.name}) - dist_id: ${u.distributor_id}`);
    });

    // Find banana distributor
    const bananaUser = await db.collection("users").findOne({
      username: { $regex: /banana/i },
    });

    if (bananaUser) {
      console.log("\nFound banana user:", JSON.stringify(bananaUser, null, 2));

      if (bananaUser.distributor_id) {
        const dist = await db
          .collection("distributors")
          .findOne({ _id: bananaUser.distributor_id });
        console.log("\nDistributor details:", JSON.stringify(dist, null, 2));
      }
    } else {
      console.log("\nNo banana user found. Checking distributor names...");
      const dist = await db.collection("distributors").findOne({
        name: { $regex: /banana/i },
      });
      if (dist) {
        console.log("Found distributor:", JSON.stringify(dist, null, 2));
      }
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
