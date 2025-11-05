require("dotenv").config();
const mongoose = require("mongoose");

async function assignProductsReadPermission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "api_permissions"
    );

    const RoleApiPermission = mongoose.model(
      "RoleApiPermission",
      new mongoose.Schema({}, { strict: false }),
      "roles_api_permissions"
    );

    const Role = mongoose.model("Role", new mongoose.Schema({}, { strict: false }), "roles");

    // Find the products:read permission
    const productsReadPerm = await ApiPermission.findOne({ api_permissions: "products:read" });
    if (!productsReadPerm) {
      console.log("❌ products:read permission not found in database!");
      process.exit(1);
    }

    console.log("✅ Found products:read permission:", productsReadPerm._id);

    // Find Inventory roles
    const inventoryRoles = await Role.find({
      role: { $in: ["Inventory Factory", "Inventory Depot"] },
    });

    if (inventoryRoles.length === 0) {
      console.log("❌ No Inventory roles found!");
      process.exit(1);
    }

    console.log(`\n📋 Found ${inventoryRoles.length} Inventory roles\n`);

    // Assign to each role
    for (const role of inventoryRoles) {
      console.log(`Processing: ${role.role} (${role._id})`);

      // Check if already assigned
      const existing = await RoleApiPermission.findOne({
        role_id: role._id,
        api_permission_id: productsReadPerm._id,
      });

      if (existing) {
        console.log(`  ⚠️  products:read already assigned to ${role.role}`);
      } else {
        const newAssignment = new RoleApiPermission({
          role_id: role._id,
          api_permission_id: productsReadPerm._id,
        });
        await newAssignment.save();
        console.log(`  ✅ Assigned products:read to ${role.role}`);
      }
    }

    console.log("\n✅ Done! Inventory roles can now access products data.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

assignProductsReadPermission();
