/**
 * PRODUCTION - Add requisition-scheduling permissions to Distribution role
 * Run on VPS: node add-requisition-scheduling-permissions.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti_happy_times";

async function addRequisitionSchedulingPerms() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to PRODUCTION\n");

    const db = mongoose.connection.db;

    // Find Distribution role
    const distRole = await db.collection("roles").findOne({ role: "Distribution" });

    if (!distRole) {
      console.log("❌ Distribution role not found!");
      process.exit(1);
    }

    console.log("=== DISTRIBUTION ROLE ===");
    console.log(`ID: ${distRole._id}`);
    console.log(`Name: ${distRole.role}\n`);

    // Check existing permissions
    const existingPerms = await db.collection("role_api_permissions")
      .find({ role_id: distRole._id })
      .toArray();

    const existingPermIds = existingPerms.map(p => p.api_permission_id.toString());

    // Get all api_permissions
    const allPerms = await db.collection("api_permissions")
      .find({ _id: { $in: existingPerms.map(p => p.api_permission_id) } })
      .toArray();

    const existingPermCodes = allPerms.map(p => p.api_permissions);

    console.log("=== CHECKING REQUISITION-SCHEDULING PERMISSIONS ===\n");

    // Required permissions for requisition scheduling
    const requiredPerms = [
      "requisition-scheduling:read",
      "requisition-scheduling:write",
      "requisition-scheduling:view-history"
    ];

    let addedCount = 0;

    for (const permCode of requiredPerms) {
      if (existingPermCodes.includes(permCode)) {
        console.log(`  ✓ ${permCode} - already exists`);
        continue;
      }

      // Find or create permission
      let perm = await db.collection("api_permissions").findOne({
        api_permissions: permCode
      });

      if (!perm) {
        const result = await db.collection("api_permissions").insertOne({
          api_permissions: permCode,
          created_at: new Date(),
          updated_at: new Date()
        });
        perm = { _id: result.insertedId, api_permissions: permCode };
        console.log(`  ✅ Created permission: ${permCode}`);
      } else {
        console.log(`  ✓ Permission exists: ${permCode}`);
      }

      // Link to Distribution role
      const existingLink = await db.collection("role_api_permissions").findOne({
        role_id: distRole._id,
        api_permission_id: perm._id
      });

      if (!existingLink) {
        await db.collection("role_api_permissions").insertOne({
          role_id: distRole._id,
          api_permission_id: perm._id,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`    → Added to Distribution role`);
        addedCount++;
      } else {
        console.log(`    → Already linked to role`);
      }
    }

    if (addedCount > 0) {
      console.log(`\n✅ Added ${addedCount} permissions to Distribution role!`);
      console.log("\n📝 User 450 must log out and back in to refresh permissions\n");
    } else {
      console.log("\n✅ All permissions already exist!\n");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addRequisitionSchedulingPerms();
