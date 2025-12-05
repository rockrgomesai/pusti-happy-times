require("dotenv").config();
const mongoose = require("mongoose");
const DeliveryChalan = require("./src/models/DeliveryChalan");
const User = require("./src/models/User");
const Distributor = require("./src/models/Distributor");

async function checkChalans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get distbanana user
    const user = await User.findOne({ username: "distbanana" }).populate("distributor_id");
    
    if (!user || !user.distributor_id) {
      console.log("❌ User or distributor not found!");
      process.exit(1);
    }

    const distributorId = user.distributor_id._id;
    console.log("📋 Distributor Info:");
    console.log("   ID:", distributorId);
    console.log("   Name:", user.distributor_id.name);
    console.log("");

    // Check for chalans
    const chalans = await DeliveryChalan.find({ distributor_id: distributorId })
      .select("chalan_no chalan_date status distributor_id")
      .sort({ chalan_date: -1 })
      .limit(10)
      .lean();

    console.log(`📦 Chalans for ${user.distributor_id.name}:`);
    console.log(`   Total found: ${chalans.length}`);
    
    if (chalans.length === 0) {
      console.log("   ⚠️  No chalans found for this distributor!");
      console.log("");
      console.log("💡 Checking all chalans in database...");
      
      const allChalans = await DeliveryChalan.find({})
        .select("chalan_no distributor_id status")
        .limit(5)
        .lean();
      
      console.log(`   Total chalans in DB: ${allChalans.length}`);
      if (allChalans.length > 0) {
        console.log("   Sample chalans:");
        allChalans.forEach(c => {
          console.log(`     - ${c.chalan_no} (Distributor: ${c.distributor_id})`);
        });
      }
    } else {
      console.log("");
      chalans.forEach(c => {
        console.log(`   - ${c.chalan_no} (${c.status}) - ${c.chalan_date}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkChalans();
