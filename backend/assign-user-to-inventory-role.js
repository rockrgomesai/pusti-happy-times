/**
 * Assign User to Inventory Role with Facility
 * Changes user from Distribution role to Inventory Depot/Factory role
 * and assigns a facility_id
 *
 * Usage: node assign-user-to-inventory-role.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const models = require("./src/models");

// MongoDB URI with fallback
const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/pusti_happy_times";

// User ID from logs
const USER_ID = "6937c4cb3b542fb84ae72666";

async function assignUserToInventoryRole() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log("📍 Using URI:", MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@"));
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find user
    console.log(`🔍 Finding user: ${USER_ID}`);
    const user = await models.User.findById(USER_ID).populate("role_id", "role");
    
    if (!user) {
      throw new Error("User not found");
    }

    console.log(`✅ User found: ${user.username} (${user.full_name})`);
    console.log(`📋 Current Role: ${user.role_id.role}`);
    console.log(`🏢 Current Facility: ${user.facility_id || 'Not assigned'}\n`);

    // Find Inventory Depot role
    console.log("🔍 Finding Inventory Depot role...");
    const inventoryDepotRole = await models.Role.findOne({ role: "Inventory Depot" });
    
    if (!inventoryDepotRole) {
      throw new Error("Inventory Depot role not found");
    }

    console.log(`✅ Found role: ${inventoryDepotRole.role} (ID: ${inventoryDepotRole._id})\n`);

    // Find an available facility (depot or factory)
    console.log("🔍 Finding available facilities...");
    const facilities = await models.Facility.find({ 
      type: { $in: ["depot", "factory"] },
      active: true 
    }).limit(10);

    if (facilities.length === 0) {
      throw new Error("No facilities found");
    }

    console.log(`✅ Found ${facilities.length} facilities:\n`);
    facilities.forEach((f, idx) => {
      console.log(`   ${idx + 1}. ${f.name} (${f.type}) - ID: ${f._id}`);
    });

    // Use first facility
    const selectedFacility = facilities[0];
    console.log(`\n📍 Selected: ${selectedFacility.name}\n`);

    // Update user
    console.log("📝 Updating user...");
    user.role_id = inventoryDepotRole._id;
    user.facility_id = selectedFacility._id;
    await user.save();

    console.log(`✅ User updated successfully!`);
    console.log(`   - Role: ${inventoryDepotRole.role}`);
    console.log(`   - Facility: ${selectedFacility.name}`);
    console.log(`\n🎉 User ${user.username} can now access Inventory Depot features!`);
    console.log(`\n📝 Note: User must logout and login again for changes to take effect.`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

assignUserToInventoryRole();
