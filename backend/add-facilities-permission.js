require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

// Define the schema matching the api_permissions collection
const apiPermissionSchema = new mongoose.Schema(
  {
    api_permissions: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { collection: "api_permissions" }
);

const ApiPermission = mongoose.model("ApiPermission", apiPermissionSchema);

async function addFacilitiesPermissions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const facilitiesPermissions = [
      "facilities:create",
      "facilities:read",
      "facilities:update",
      "facilities:delete",
    ];

    for (const permission of facilitiesPermissions) {
      const existing = await ApiPermission.findOne({
        api_permissions: permission,
      });

      if (existing) {
        console.log(`✓ Permission ${permission} already exists`);
      } else {
        await ApiPermission.create({ api_permissions: permission });
        console.log(`✅ Created permission: ${permission}`);
      }
    }

    console.log("\n✅ All facilities permissions added successfully!");

    // Now assign these permissions to SuperAdmin role
    console.log("\n📋 Assigning permissions to SuperAdmin role...");

    const RoleApiPermission = mongoose.model(
      "RoleApiPermission",
      new mongoose.Schema(
        {
          role_id: mongoose.Schema.Types.ObjectId,
          api_permission_id: mongoose.Schema.Types.ObjectId,
        },
        { collection: "roles_api_permissions" }
      )
    );

    // Find SuperAdmin role (typically the first role created)
    const rolesCollection = mongoose.connection.collection("roles");
    const superAdminRole = await rolesCollection.findOne({ role: "SuperAdmin" });

    if (superAdminRole) {
      console.log(`Found SuperAdmin role: ${superAdminRole._id}`);

      for (const permission of facilitiesPermissions) {
        const apiPerm = await ApiPermission.findOne({ api_permissions: permission });

        if (apiPerm) {
          const existing = await RoleApiPermission.findOne({
            role_id: superAdminRole._id,
            api_permission_id: apiPerm._id,
          });

          if (!existing) {
            await RoleApiPermission.create({
              role_id: superAdminRole._id,
              api_permission_id: apiPerm._id,
            });
            console.log(`✅ Assigned ${permission} to SuperAdmin`);
          } else {
            console.log(`✓ ${permission} already assigned to SuperAdmin`);
          }
        }
      }
    } else {
      console.log("⚠️  SuperAdmin role not found - permissions created but not assigned");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addFacilitiesPermissions();
