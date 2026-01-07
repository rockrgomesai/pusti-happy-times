/**
 * Fix Collection Submit Permission
 * Adds collection:submit permission for Distributors to submit pending collections to ASM
 * Run: node fix-collection-submit-permission.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin";

async function fixCollectionSubmitPermission() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const ApiPermission = mongoose.model(
      "ApiPermission",
      new mongoose.Schema({
        api_permission: String,
        description: String,
      })
    );

    const RoleApiPermission = mongoose.model(
      "RoleApiPermission",
      new mongoose.Schema({
        role_id: mongoose.Schema.Types.ObjectId,
        api_permission_id: mongoose.Schema.Types.ObjectId,
      })
    );

    const Role = mongoose.model(
      "Role",
      new mongoose.Schema({
        role: String,
      })
    );

    // Create collection:submit permission
    console.log("📝 Creating collection:submit permission...\n");
    
    let submitPermission = await ApiPermission.findOne({ api_permission: "collection:submit" });
    
    if (submitPermission) {
      console.log("   ℹ️  Permission already exists: collection:submit");
    } else {
      submitPermission = await ApiPermission.create({
        api_permission: "collection:submit",
        description: "Submit collection from pending to ASM (Distributor only)"
      });
      console.log("   ✅ Created permission: collection:submit");
    }

    // Find Distributor role
    console.log("\n📋 Assigning to Distributor role...\n");
    const distributorRole = await Role.findOne({ role: "Distributor" });

    if (!distributorRole) {
      console.error("❌ Distributor role not found!");
      process.exit(1);
    }

    console.log(`   Found role: ${distributorRole.role} (${distributorRole._id})`);

    // Check if already assigned
    const existing = await RoleApiPermission.findOne({
      role_id: distributorRole._id,
      api_permission_id: submitPermission._id,
    });

    if (existing) {
      console.log("   ℹ️  Permission already assigned to Distributor");
    } else {
      await RoleApiPermission.create({
        role_id: distributorRole._id,
        api_permission_id: submitPermission._id,
      });
      console.log("   ✅ Assigned collection:submit to Distributor");
    }

    // Also ensure collection:forward exists and is assigned to proper roles
    console.log("\n📋 Verifying collection:forward permission...\n");
    
    let forwardPermission = await ApiPermission.findOne({ api_permission: "collection:forward" });
    
    if (!forwardPermission) {
      forwardPermission = await ApiPermission.create({
        api_permission: "collection:forward",
        description: "Forward collection to next approver (ASM, RSM, Sales Admin, Order Management)"
      });
      console.log("   ✅ Created permission: collection:forward");
    } else {
      console.log("   ℹ️  Permission exists: collection:forward");
    }

    // Assign collection:forward to ASM, RSM, Sales Admin, Order Management
    const forwardRoles = ["ASM", "RSM", "Sales Admin", "Order Management"];
    
    for (const roleName of forwardRoles) {
      const role = await Role.findOne({ role: roleName });
      
      if (!role) {
        console.log(`   ⚠️  Role not found: ${roleName}`);
        continue;
      }

      const existingAssignment = await RoleApiPermission.findOne({
        role_id: role._id,
        api_permission_id: forwardPermission._id,
      });

      if (existingAssignment) {
        console.log(`   ℹ️  Already assigned to ${roleName}`);
      } else {
        await RoleApiPermission.create({
          role_id: role._id,
          api_permission_id: forwardPermission._id,
        });
        console.log(`   ✅ Assigned collection:forward to ${roleName}`);
      }
    }

    console.log("\n\n🎉 Collection permissions fixed successfully!");
    console.log("\n⚠️  IMPORTANT: Users must logout and login again to refresh their permissions.\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixCollectionSubmitPermission();
