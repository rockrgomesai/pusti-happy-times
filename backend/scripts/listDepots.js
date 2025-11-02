const mongoose = require("mongoose");
const Facility = require("../src/models/Facility");
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const all = await Facility.find({});
  console.log(`Found ${all.length} facilities:`);
  all.forEach((f) => console.log(`  - ${f.name} (${f.type}) - ${f._id}`));

  const depots = all.filter((f) => f.type === "depot");
  console.log(`\nDepots: ${depots.length}`);

  mongoose.connection.close();
});
