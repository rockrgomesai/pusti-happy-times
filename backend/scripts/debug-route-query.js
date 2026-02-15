require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Route = require("../src/models/Route");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function debugRouteQuery() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const userId = "698060f30d5b4e5b48ae82a0";
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const today = "SAT";

    console.log("\n🔍 Looking for route with:");
    console.log("   User ID (string):", userId);
    console.log("   User ID (ObjectId):", userIdObj);
    console.log("   Day:", today);

    // Check route by route_id first
    const routeByRouteId = await Route.findOne({ route_id: "R1-DPBEV1-D1" });
    console.log("\n🛣️  Route R1-DPBEV1-D1:", routeByRouteId ? "EXISTS" : "NOT FOUND");
    if (routeByRouteId) {
      console.log("   SR1 ID:", routeByRouteId.sr_assignments?.sr_1?.sr_id, "Type:", typeof routeByRouteId.sr_assignments?.sr_1?.sr_id);
      console.log("   SR1 Visit Days:", routeByRouteId.sr_assignments?.sr_1?.visit_days);
      console.log("   SR2 ID:", routeByRouteId.sr_assignments?.sr_2?.sr_id);
      console.log("   SR2 Visit Days:", routeByRouteId.sr_assignments?.sr_2?.visit_days);
    }

    // First, find all routes for this user regardless of day (try ObjectId)
    const allUserRoutes = await Route.find({
      $or: [
        { "sr_assignments.sr_1.sr_id": userIdObj },
        { "sr_assignments.sr_2.sr_id": userIdObj },
      ],
    });

    console.log("\n📊 All routes for this user:", allUserRoutes.length);
    
    for (const route of allUserRoutes) {
      console.log("\n🛣️  Route:", route.route_id);
      console.log("   Active:", route.active);
      console.log("   SR1:", {
        sr_id: route.sr_assignments?.sr_1?.sr_id,
        visit_days: route.sr_assignments?.sr_1?.visit_days,
      });
      console.log("   SR2:", {
        sr_id: route.sr_assignments?.sr_2?.sr_id,
        visit_days: route.sr_assignments?.sr_2?.visit_days,
      });
      console.log("   Outlets:", route.outlet_ids?.length || 0);
    }

    // Now try the actual query
    const route = await Route.findOne({
      $or: [
        {
          "sr_assignments.sr_1.sr_id": userIdObj,
          "sr_assignments.sr_1.visit_days": { $in: [today] },
        },
        {
          "sr_assignments.sr_2.sr_id": userIdObj,
          "sr_assignments.sr_2.visit_days": { $in: [today] },
        },
      ],
      active: true,
    });

    console.log("\n🎯 Query result:", route ? route.route_id : "NONE");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

debugRouteQuery();
