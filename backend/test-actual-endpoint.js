const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function testActualEndpoint() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const models = {
      DeliveryChalan: mongoose.model(
        "DeliveryChalan",
        require("./src/models/DeliveryChalan").schema
      ),
    };

    const depot_id = new mongoose.Types.ObjectId("68f2855dbdde87d90d1b9cf1");
    const query = { depot_id };

    console.log("=== SIMULATING BACKEND ENDPOINT ===");
    console.log("Query:", query);

    const [chalans, total] = await Promise.all([
      models.DeliveryChalan.find(query)
        .populate("distributor_id", "name address phone")
        .populate("transport_id", "transport")
        .populate("load_sheet_id", "load_sheet_number")
        .sort({ chalan_date: -1 })
        .skip(0)
        .limit(20)
        .lean(),
      models.DeliveryChalan.countDocuments(query),
    ]);

    console.log("\n=== RESULTS ===");
    console.log("Total count:", total);
    console.log("Chalans returned:", chalans.length);

    if (chalans.length > 0) {
      console.log("\n=== SAMPLE CHALAN ===");
      const first = chalans[0];
      console.log("Chalan No:", first.chalan_no);
      console.log("Distributor:", first.distributor_id);
      console.log("Transport:", first.transport_id);
      console.log("Load Sheet:", first.load_sheet_id);
      console.log("Status:", first.status);
      console.log("Date:", first.chalan_date);
      console.log("Items:", first.items?.length || 0);
    } else {
      console.log("\n❌ No chalans found!");
    }

    const response = {
      success: true,
      data: chalans,
      pagination: {
        page: 1,
        limit: 20,
        total,
        pages: Math.ceil(total / 20),
      },
    };

    console.log("\n=== RESPONSE ===");
    console.log(JSON.stringify(response, null, 2).substring(0, 500));

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testActualEndpoint();
