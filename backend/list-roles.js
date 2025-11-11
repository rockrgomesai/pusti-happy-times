const mongoose = require("mongoose");
const Role = require("./src/models/Role");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function listRoles() {
  await mongoose.connect(MONGO_URI);
  const roles = await Role.find({}, "role");
  console.log("Available roles:");
  roles.forEach((r) => console.log(`  - "${r.role}" (${r._id})`));
  await mongoose.connection.close();
}

listRoles();
