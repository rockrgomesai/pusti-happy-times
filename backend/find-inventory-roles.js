const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const models = require("./src/models");

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const roles = await models.Role.find({
    role_name: { $in: ["Inventory Depot", "Inventory Factory"] },
  }).lean();

  console.log("Found roles:");
  roles.forEach((r) => console.log(`  ${r.role_name}: ${r._id}`));

  process.exit(0);
});
