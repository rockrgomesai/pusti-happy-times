require("dotenv").config();
const mongoose = require("mongoose");

async function checkPermissions() {
  await mongoose.connect(process.env.MONGODB_URI);
  const perms = await mongoose.connection.db
    .collection("api_permissions")
    .find({})
    .limit(3)
    .toArray();
  console.log("Sample permissions:", JSON.stringify(perms, null, 2));
  await mongoose.connection.close();
}

checkPermissions();
