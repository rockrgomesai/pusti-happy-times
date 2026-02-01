/**
 * Create Outlets API Permissions
 * This script creates the necessary API permissions for the Outlets module
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-ht-mern";

const ApiPermissionSchema = new mongoose.Schema(
  {
    api_permissions: { type: String, required: true, unique: true },
    description: String,
    module: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

async function createOutletsPermissions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    const ApiPermission = mongoose.model("ApiPermission", ApiPermissionSchema, "api_permissions");

    const outletPermissions = [
      {
        api_permissions: "outlets:read",
        description: "View outlets list and details",
        module: "Routes & Outlets",
        active: true,
      },
      {
        api_permissions: "outlets:create",
        description: "Create new outlets",
        module: "Routes & Outlets",
        active: true,
      },
      {
        api_permissions: "outlets:update",
        description: "Update existing outlets",
        module: "Routes & Outlets",
        active: true,
      },
      {
        api_permissions: "outlets:delete",
        description: "Deactivate outlets",
        module: "Routes & Outlets",
        active: true,
      },
    ];

    console.log("Creating outlet permissions...\n");

    for (const permission of outletPermissions) {
      const existing = await ApiPermission.findOne({ api_permissions: permission.api_permissions });

      if (existing) {
        console.log(`✓ Permission already exists: ${permission.api_permissions}`);
      } else {
        await ApiPermission.create(permission);
        console.log(`✓ Created permission: ${permission.api_permissions}`);
      }
    }

    console.log("\n✅ All outlet permissions created successfully!");
    console.log("\nNext step: Assign these permissions to roles using the role assignment script.");
  } catch (error) {
    console.error("❌ Error creating permissions:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

createOutletsPermissions();
