require("dotenv").config();
const mongoose = require("mongoose");

async function addLoadSheetPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Get collections
    const rolesCollection = db.collection("roles");
    const apiPermsCollection = db.collection("api_permissions");
    const roleApiPermsCollection = db.collection("role_api_permissions");

    // Find Inventory Depot role
    const role = await rolesCollection.findOne({ role: "Inventory Depot" });
    if (!role) {
      console.log("❌ Inventory Depot role not found");
      process.exit(1);
    }

    console.log(`Role: ${role.role} (${role._id})\n`);

    // Permissions needed
    const permissionsToAdd = ["load-sheet:create", "load-sheet:read", "load-sheet:list"];

    console.log("Adding permissions...\n");

    for (const permName of permissionsToAdd) {
      // Find or create permission
      let permission = await apiPermsCollection.findOne({ api_permissions: permName });

      if (!permission) {
        console.log(`Creating permission: ${permName}`);
        const result = await apiPermsCollection.insertOne({
          api_permissions: permName,
        });
        permission = { _id: result.insertedId, api_permissions: permName };
      } else {
        console.log(`Permission exists: ${permName}`);
      }

      // Check if role-permission link exists
      const linkExists = await roleApiPermsCollection.findOne({
        role_id: role._id,
        api_permission_id: permission._id,
      });

      if (!linkExists) {
        await roleApiPermsCollection.insertOne({
          role_id: role._id,
          api_permission_id: permission._id,
        });
        console.log(`✓ Linked ${permName} to Inventory Depot`);
      } else {
        console.log(`  Already linked: ${permName}`);
      }

      console.log("");
    }

    // Verify final state
    const allLinks = await roleApiPermsCollection.find({ role_id: role._id }).toArray();

    const linkedPermIds = allLinks.map((link) => link.api_permission_id);
    const linkedPerms = await apiPermsCollection.find({ _id: { $in: linkedPermIds } }).toArray();

    console.log(`\n✅ Inventory Depot now has ${linkedPerms.length} API permissions:`);
    linkedPerms.forEach((p) => console.log(`   - ${p.api_permissions}`));

    console.log("\n✅ Done! Please log out and log back in.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addLoadSheetPermissions();
