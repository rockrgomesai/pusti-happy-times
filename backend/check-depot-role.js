const mongoose = require("mongoose");
const models = require("./src/models");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

mongoose.connect(MONGO_URI).then(async () => {
  // Get all roles
  const allRoles = await models.Role.find({});

  console.log(`Found ${allRoles.length} roles:\n`);

  allRoles.forEach((r) => {
    if (r.role && r.role.includes("Inventory")) {
      console.log(`ID: ${r._id}`);
      console.log(`  role field: ${JSON.stringify(r.role)}`);
      console.log(`  name field: ${JSON.stringify(r.name)}`);
      console.log("");
    }
  });

  process.exit(0);
});
