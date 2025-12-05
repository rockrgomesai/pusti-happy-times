const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function checkUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Find the user
    const user = await db.collection("users").findOne({ username: "inventorymanagerpapaya" });
    
    if (!user) {
      console.log("❌ User not found");
      await mongoose.disconnect();
      return;
    }

    console.log("=== USER INFO ===");
    console.log("Username:", user.username);
    console.log("Role ID:", user.role_id);
    console.log("Facility ID:", user.facility_id);

    // Get role details
    const role = await db.collection("roles").findOne({ _id: user.role_id });
    if (role) {
      console.log("Role Name:", role.name);
    }

    // Get facility details
    const facility = await db.collection("facilities").findOne({ _id: user.facility_id });
    if (facility) {
      console.log("Facility Name:", facility.name);
      console.log("Facility Type:", facility.type);
    }

    // Check chalans for this facility
    console.log("\n=== CHALANS FOR THIS DEPOT ===");
    const chalans = await db
      .collection("deliverychalans")
      .find({ depot_id: user.facility_id })
      .toArray();
    
    console.log("Chalans found:", chalans.length);
    if (chalans.length > 0) {
      chalans.forEach((c) => {
        console.log(`  - ${c.chalan_no} (${c.status}) - ${c.distributor_name}`);
      });
    }

    // Check all chalans to see what depot_ids exist
    console.log("\n=== ALL CHALANS IN DATABASE ===");
    const allChalans = await db.collection("deliverychalans").find().toArray();
    console.log("Total chalans:", allChalans.length);
    
    const depotIds = [...new Set(allChalans.map((c) => c.depot_id.toString()))];
    console.log("\nUnique depot_ids in chalans:");
    for (const depotId of depotIds) {
      const depot = await db.collection("facilities").findOne({ _id: new mongoose.Types.ObjectId(depotId) });
      const count = allChalans.filter((c) => c.depot_id.toString() === depotId).length;
      console.log(`  - ${depotId}: ${depot ? depot.name : "Unknown"} (${count} chalans)`);
    }

    // Check role permissions
    console.log("\n=== ROLE PERMISSIONS ===");
    const rolePerms = await db
      .collection("roleapipermissions")
      .find({ role_id: user.role_id })
      .toArray();

    const permIds = rolePerms.map((rp) => rp.api_permission_id);
    const perms = await db
      .collection("apipermissions")
      .find({ _id: { $in: permIds }, key: { $regex: "chalan" } })
      .toArray();

    console.log("Chalan permissions:", perms.length);
    perms.forEach((p) => console.log(`  - ${p.key}: ${p.description}`));

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkUser();
