const mongoose = require("mongoose");
const { ApiPermission } = require("./src/models/Permission");
const { RoleApiPermission } = require("./src/models/JunctionTables");

async function checkUserPermissions() {
  try {
    await mongoose.connect(
      "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin"
    );
    console.log("Connected to MongoDB\n");

    // Get user collection
    const usersCollection = mongoose.connection.collection("users");
    const rolesCollection = mongoose.connection.collection("roles");

    // List all users with their roles
    const users = await usersCollection.find({}).limit(10).toArray();

    console.log("=== Users and Their Current Permissions ===\n");

    for (const user of users) {
      console.log(`\n${user.username || user.email || "Unknown User"}`);
      console.log("─".repeat(60));

      if (user.role_id) {
        // Get role
        const role = await rolesCollection.findOne({
          _id: new mongoose.Types.ObjectId(user.role_id),
        });

        if (role) {
          console.log(`Role: ${role.role}`);

          // Get all permissions for this role
          const rolePerms = await RoleApiPermission.find({
            role_id: new mongoose.Types.ObjectId(role._id),
          }).populate("api_permission_id");

          // Filter for offers and territories
          const relevantPerms = rolePerms.filter((rp) => {
            const perm = rp.api_permission_id.api_permissions;
            return (
              perm.startsWith("offers:") ||
              perm.startsWith("territories:") ||
              perm.startsWith("roles:")
            );
          });

          if (relevantPerms.length > 0) {
            console.log("\nRelevant Permissions (offers, territories, roles):");
            relevantPerms.forEach((rp) => {
              console.log(`  ✓ ${rp.api_permission_id.api_permissions}`);
            });
          } else {
            console.log("\n❌ No offers/territories/roles permissions found");
          }

          console.log(`\nTotal API Permissions: ${rolePerms.length}`);
        } else {
          console.log("❌ Role not found");
        }
      } else {
        console.log("❌ No role assigned");
      }
    }

    console.log("\n\n=== Summary ===");
    console.log("These permissions are in the DATABASE.");
    console.log("If you're still getting 403 errors, you need to:");
    console.log("  1. LOG OUT from the application");
    console.log("  2. LOG BACK IN to refresh your session");
    console.log("  3. Your session will then have these permissions\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  }
}

checkUserPermissions();
