const mongoose = require("mongoose");
require("dotenv").config();

const setupDemandOrderPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Define demandorder permissions
    const demandOrderPermissions = [
      {
        api_permissions: "demandorder:read",
      },
      {
        api_permissions: "demandorder:create",
      },
      {
        api_permissions: "demandorder:update",
      },
      {
        api_permissions: "demandorder:delete",
      },
    ];

    console.log("📝 Creating demandorder API permissions...");

    const insertedPermissions = [];
    for (const perm of demandOrderPermissions) {
      // Check if permission already exists
      const existing = await mongoose.connection.db
        .collection("api_permissions")
        .findOne({ api_permissions: perm.api_permissions });

      if (existing) {
        console.log(`   ⏭️  ${perm.api_permissions} already exists`);
        insertedPermissions.push(existing);
      } else {
        const result = await mongoose.connection.db.collection("api_permissions").insertOne(perm);
        console.log(`   ✅ ${perm.api_permissions} created`);
        insertedPermissions.push({ ...perm, _id: result.insertedId });
      }
    }

    console.log();

    // Find Distributor role
    const distributorRole = await mongoose.connection.db
      .collection("roles")
      .findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.log("❌ Distributor role not found!");
      await mongoose.disconnect();
      return;
    }

    console.log(`🔑 Found role: ${distributorRole.role} (${distributorRole._id})`);
    console.log();

    // Assign permissions to Distributor role
    console.log("📌 Assigning permissions to Distributor role...");

    for (const perm of insertedPermissions) {
      // Check if already assigned
      const existing = await mongoose.connection.db.collection("role_api_permissions").findOne({
        role_id: distributorRole._id,
        api_permission_id: perm._id,
      });

      if (existing) {
        console.log(`   ⏭️  ${perm.api_permissions} already assigned`);
      } else {
        await mongoose.connection.db.collection("role_api_permissions").insertOne({
          role_id: distributorRole._id,
          api_permission_id: perm._id,
          created_by: "system_setup",
          updated_by: "system_setup",
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`   ✅ ${perm.api_permissions} assigned`);
      }
    }

    console.log();
    console.log("✅ Setup complete!");
    console.log();
    console.log("🔄 Please ask the user to:");
    console.log("   1. Log out from the application");
    console.log("   2. Log back in as distbanana");
    console.log("   3. Try accessing the Demand Orders page");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

setupDemandOrderPermissions();
