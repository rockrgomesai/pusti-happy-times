const mongoose = require("mongoose");

mongoose
  .connect("mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin")
  .then(async () => {
    const db = mongoose.connection.db;

    const distributors = await db.collection("distributors").find({}).toArray();
    console.log(`Found ${distributors.length} distributors:`);
    distributors.forEach((d) => {
      console.log(`- ${d.username} (${d.name}) - depot: ${d.depot_id}, segment: ${d.segment}`);
    });

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
