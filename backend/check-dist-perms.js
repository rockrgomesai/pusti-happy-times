require("dotenv").config();
const mongoose = require("mongoose");

async function checkDistributorPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const distributorRoleId = mongoose.Types.ObjectId.createFromHexString(
      "68be2193ea73210503fa3352"
    );

    // Check role_api_permissions
    const roleApiPerms = await db
      .collection("role_api_permissions")
      .find({
        role_id: distributorRoleId,
      })
      .toArray();

    console.log("Distributor API permissions count:", roleApiPerms.length);

    if (roleApiPerms.length > 0) {
      const apiPermIds = roleApiPerms.map((r) => r.api_permission_id);
      const apiPerms = await db
        .collection("api_permissions")
        .find({
          _id: { $in: apiPermIds },
        })
        .toArray();

      console.log("\nCurrent permissions:");
      apiPerms.forEach((p) => console.log("-", p.permission_key, ":", p.description));

      // Check if demandorder:create exists
      const hasCreate = apiPerms.find((p) => p.permission_key === "demandorder:create");
      console.log("\n✓ Has demandorder:create:", !!hasCreate);

      const hasRead = apiPerms.find((p) => p.permission_key === "demandorder:read");
      console.log("✓ Has demandorder:read:", !!hasRead);
    } else {
      console.log("\n❌ No API permissions assigned to Distributor role!");
    }

    // Check if demandorder:create permission exists in DB
    const createPerm = await db.collection("api_permissions").findOne({
      permission_key: "demandorder:create",
    });

    if (createPerm) {
      console.log("\n✓ demandorder:create permission exists in database");
      console.log("  ID:", createPerm._id);
      console.log("  Description:", createPerm.description);
    } else {
      console.log("\n❌ demandorder:create permission does NOT exist in database");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkDistributorPermissions();
