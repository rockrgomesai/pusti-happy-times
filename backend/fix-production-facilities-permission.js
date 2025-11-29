const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function addFacilitiesReadPermission() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // 1. Find Production role
    const productionRole = await db.collection("roles").findOne({ role: "Production" });
    if (!productionRole) {
      console.error("❌ Production role not found");
      process.exit(1);
    }
    console.log("✅ Found Production role:", productionRole._id);

    // 2. Find facilities:read API permission
    const facilitiesReadPerm = await db.collection("api_permissions").findOne({
      api_permissions: "facilities:read",
    });

    if (!facilitiesReadPerm) {
      console.error("❌ facilities:read permission not found");
      process.exit(1);
    }
    console.log("✅ Found facilities:read permission:", facilitiesReadPerm._id);

    // 3. Check if already assigned
    const existing = await db.collection("role_api_permissions").findOne({
      role_id: productionRole._id,
      api_permission_id: facilitiesReadPerm._id,
    });

    if (existing) {
      console.log("ℹ️  Production role already has facilities:read permission");
    } else {
      // 4. Assign permission
      await db.collection("role_api_permissions").insertOne({
        role_id: productionRole._id,
        api_permission_id: facilitiesReadPerm._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✅ Assigned facilities:read permission to Production role");
    }

    console.log("\n✅ Fix completed successfully!");
    console.log("Production users can now read facility details.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

addFacilitiesReadPermission();
