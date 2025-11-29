const { MongoClient } = require("mongodb");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function checkProductionPermissions() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    // Find Production role
    const productionRole = await db.collection("roles").findOne({ role: "Production" });
    console.log("Production Role ID:", productionRole._id);

    // Find all API permissions for Production
    const roleApiPerms = await db
      .collection("role_api_permissions")
      .find({ role_id: productionRole._id })
      .toArray();

    console.log(`\nProduction role has ${roleApiPerms.length} API permissions`);

    // Get permission details
    const permIds = roleApiPerms.map((r) => r.api_permission_id);
    const permissions = await db
      .collection("api_permissions")
      .find({ _id: { $in: permIds } })
      .toArray();

    console.log("\nAPI Permissions:");
    permissions.forEach((p) => {
      console.log(`  - ${p.api_permissions}`);
    });

    // Check if facilities:read exists
    const hasFacilitiesRead = permissions.some((p) => p.api_permissions === "facilities:read");
    console.log(`\n✓ Has facilities:read: ${hasFacilitiesRead}`);

    if (!hasFacilitiesRead) {
      console.log("\n❌ MISSING facilities:read permission!");
      console.log("This is causing the 403 errors on /api/v1/facilities/:id");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkProductionPermissions();
