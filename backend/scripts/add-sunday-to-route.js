const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addSundayToRoute() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const Route = mongoose.model("Route", new mongoose.Schema({}, { strict: false }), "routes");

    const route = await Route.findOne({ route_id: "R1-DPBEV1-D1" });

    if (!route) {
      console.log("❌ Route R1-DPBEV1-D1 not found");
      process.exit(1);
    }

    console.log("Current visit days:", route.sr_assignments.sr_1.visit_days);

    const visitDays = route.sr_assignments.sr_1.visit_days || [];

    if (!visitDays.includes("SUN")) {
      visitDays.push("SUN");

      await Route.updateOne(
        { _id: route._id },
        { $set: { "sr_assignments.sr_1.visit_days": visitDays } }
      );

      console.log("✅ Added SUN to visit days");
    } else {
      console.log("ℹ️  SUN already in visit days");
    }

    const updated = await Route.findOne({ route_id: "R1-DPBEV1-D1" });
    console.log("Updated visit days:", updated.sr_assignments.sr_1.visit_days);
    console.log("\n✅ Route now works for:", updated.sr_assignments.sr_1.visit_days.join(", "));
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n📡 Database connection closed");
  }
}

addSundayToRoute();
