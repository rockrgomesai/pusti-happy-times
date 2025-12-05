require("dotenv").config();
const mongoose = require("mongoose");
const DeliveryChalan = require("./src/models/DeliveryChalan");
const User = require("./src/models/User");
const Distributor = require("./src/models/Distributor");
const Facility = require("./src/models/Facility");
const Transport = require("./src/models/Transport");
const LoadSheet = require("./src/models/LoadSheet");

async function createTestChalan() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get distbanana user and distributor
    const user = await User.findOne({ username: "distbanana" }).populate("distributor_id");
    
    if (!user || !user.distributor_id) {
      console.log("❌ User or distributor not found!");
      process.exit(1);
    }

    const distributorId = user.distributor_id._id;
    console.log("📋 Creating chalan for:", user.distributor_id.name);

    // Get any facility to use as depot
    const depot = await Facility.findOne({});
    if (!depot) {
      console.log("❌ No facility found!");
      process.exit(1);
    }
    console.log("📍 Depot ID:", depot._id);

    // Get a transport
    const transport = await Transport.findOne({});
    if (!transport) {
      console.log("❌ No transport found!");
      process.exit(1);
    }
    console.log("🚚 Transport:", transport.transport);

    // Create a test chalan
    const chalanNo = `TEST-CHN-${Date.now()}`;
    
    const chalanData = {
      chalan_no: chalanNo,
      chalan_date: new Date(),
      depot_id: depot._id,
      distributor_id: distributorId,
      transport_id: transport._id,
      vehicle_no: "TEST-1234",
      driver_name: "Test Driver",
      driver_phone: "1234567890",
      items: [
        {
          sku: "TEST-SKU-001",
          product_name: "Test Product 1",
          uom: "CTN",
          qty_ctn: 10,
          qty_pcs: 0,
        },
        {
          sku: "TEST-SKU-002",
          product_name: "Test Product 2",
          uom: "CTN",
          qty_ctn: 5,
          qty_pcs: 0,
        },
      ],
      total_qty_ctn: 15,
      total_qty_pcs: 0,
      status: "Generated",
      created_by: user._id,
    };

    const chalan = await DeliveryChalan.create(chalanData);
    
    console.log("\n✅ Test chalan created successfully!");
    console.log("   Chalan No:", chalan.chalan_no);
    console.log("   Status:", chalan.status);
    console.log("   Items:", chalan.items.length);
    console.log("   Total Qty:", chalan.total_qty_ctn, "CTN");
    console.log("\n💡 You can now view this chalan in the Receive Chalans page!");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createTestChalan();
