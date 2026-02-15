const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkRouteAssignments() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Route = mongoose.model("Route", new mongoose.Schema({}, { strict: false }), "routes");
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");

    const so1 = await User.findOne({ username: "SO1-ABIS" });
    console.log(`SO1-ABIS ID: ${so1._id}\n`);

    // Check what routes exist with sr_assignments
    const allRoutes = await Route.find({
      $or: [
        { "sr_assignments.sr_1.sr_id": { $exists: true, $ne: null } },
        { "sr_assignments.sr_2.sr_id": { $exists: true, $ne: null } },
      ],
    }).limit(5);

    console.log(`Found ${allRoutes.length} routes with SR assignments:\n`);

    allRoutes.forEach((route, i) => {
      console.log(`Route ${i + 1}: ${route.route_id}`);
      console.log(`  SR1 ID: ${route.sr_assignments?.sr_1?.sr_id}`);
      console.log(`  SR1 Days: ${route.sr_assignments?.sr_1?.visit_days?.join(", ")}`);
      console.log(`  SR2 ID: ${route.sr_assignments?.sr_2?.sr_id}`);
      console.log(`  SR2 Days: ${route.sr_assignments?.sr_2?.visit_days?.join(", ")}`);
      console.log(`  Outlet IDs: ${route.outlet_ids?.length || 0}`);
      console.log();
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    await mongoose.connection.close();
  }
}

checkRouteAssignments();
