const mongoose = require("mongoose");
const Distributor = require("./src/models/Distributor");
const Territory = require("./src/models/Territory");
require("dotenv").config();

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function queryDistributors() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find Distributor-0001 and Distributor-0002
    const distributors = await Distributor.find({
      name: { $in: ["Distributor-0001", "Distributor-0002"] },
    }).lean();

    console.log(`Found ${distributors.length} distributors:\n`);

    for (const dist of distributors) {
      console.log(`📦 ${dist.name}`);
      console.log(`   ID: ${dist._id}`);
      console.log(`   Type: ${dist.distributor_type}`);
      console.log(`   Product Segments: ${dist.product_segment.join(", ")}`);
      console.log(`   Created: ${dist.created_at}`);
      console.log(`   Updated: ${dist.updated_at}`);

      // Get DB Point details with full hierarchy
      if (dist.db_point_id) {
        const dbPoint = await Territory.findById(dist.db_point_id).lean();
        if (dbPoint) {
          console.log(`   DB Point: ${dbPoint.name} (${dbPoint.territory_id || "N/A"})`);

          // Get Area
          if (dbPoint.parent_id) {
            const area = await Territory.findById(dbPoint.parent_id).lean();
            if (area) {
              console.log(`   Area: ${area.name} (${area.territory_id || "N/A"})`);

              // Get Region
              if (area.parent_id) {
                const region = await Territory.findById(area.parent_id).lean();
                if (region) {
                  console.log(`   Region: ${region.name} (${region.territory_id || "N/A"})`);

                  // Get Zone
                  if (region.parent_id) {
                    const zone = await Territory.findById(region.parent_id).lean();
                    if (zone) {
                      console.log(`   Zone: ${zone.name} (${zone.territory_id || "N/A"})`);
                    }
                  }
                }
              }
            }
          }
        }
      }
      console.log("");
    }

    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

queryDistributors();
