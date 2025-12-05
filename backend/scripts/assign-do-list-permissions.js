/**
 * Assign DO List API Permissions to Roles
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const setup = async () => {
  try {
    console.log("\n🚀 Assigning DO List API Permissions to Roles...\n");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    const db = mongoose.connection.db;

    // Get API permissions
    const apiPermsCollection = db.collection("api_permissions");
    const doListPerms = await apiPermsCollection
      .find({
        api_permissions: {
          $in: [
            "do-list:read",
            "do-list:search",
            "do-list:view-details",
            "do-list:view-history",
            "my-do-list:read",
          ],
        },
      })
      .toArray();

    console.log(`Found ${doListPerms.length} DO List API permissions`);

    // Get roles
    const rolesCollection = db.collection("roles");
    const roles = await rolesCollection
      .find({
        role: {
          $in: [
            "ASM",
            "RSM",
            "TSO",
            "Territory Manager",
            "Finance Manager",
            "Finance Admin",
            "Admin",
            "SuperAdmin",
          ],
        },
      })
      .toArray();

    console.log(`Found ${roles.length} roles to assign permissions`);

    // Assign permissions to roles
    const roleApiPermsCollection = db.collection("role_api_permissions");

    let assignedCount = 0;
    let skippedCount = 0;

    for (const role of roles) {
      console.log(`\n📋 Processing role: ${role.role}`);

      for (const perm of doListPerms) {
        const existing = await roleApiPermsCollection.findOne({
          role_id: role._id,
          api_permission_id: perm._id,
        });

        if (existing) {
          console.log(`  ⚠️  Already has: ${perm.api_permissions}`);
          skippedCount++;
        } else {
          await roleApiPermsCollection.insertOne({
            role_id: role._id,
            api_permission_id: perm._id,
          });
          console.log(`  ✅ Assigned: ${perm.api_permissions}`);
          assignedCount++;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Permission Assignment Complete!\n");
    console.log(`📊 Summary:`);
    console.log(`   - Assigned: ${assignedCount} permissions`);
    console.log(`   - Skipped (already exists): ${skippedCount}`);
    console.log(`   - Total roles: ${roles.length}`);
    console.log(`   - Total permissions: ${doListPerms.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
};

setup();
