const mongoose = require("mongoose");
require("dotenv").config();

const checkRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const roles = await mongoose.connection.db.collection("roles").find({}).toArray();
    console.log(`📋 Found ${roles.length} roles:\n`);

    roles.forEach((role) => {
      console.log(`   - ${role.name} (${role._id})`);
      console.log(`     Description: ${role.description || "N/A"}`);
      console.log();
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

checkRoles();
