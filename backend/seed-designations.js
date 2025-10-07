/**
 * Seed Designations Collection
 * Pusti Happy Times - Initial Designation Data Setup
 * 
 * This script creates the designations collection and seeds it with
 * initial data including the "Sales Admin" designation as requested.
 * 
 * Usage: node seed-designations.js
 */

require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const Designation = require("./src/models/Designation");
const { User } = require("./src/models");

/**
 * Database connection
 */
const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/pusti-happy-times";
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

/**
 * Initial designations data
 */
const initialDesignations = [
  {
    name: "Sales Admin",
    active: true
  },
  {
    name: "HR Manager",
    active: true
  },
  {
    name: "Software Developer",
    active: true
  },
  {
    name: "Marketing Executive",
    active: true
  },
  {
    name: "Business Analyst",
    active: true
  },
  {
    name: "Account Manager",
    active: true
  },
  {
    name: "Team Lead",
    active: true
  },
  {
    name: "Project Manager",
    active: true
  }
];

/**
 * Seed designations
 */
const seedDesignations = async () => {
  try {
    console.log("🌱 Starting designation seeding process...");

    // Find a system user to use for audit fields
    let systemUser = await User.findOne({ role: { $exists: true } }).populate('role');
    
    if (!systemUser) {
      // Try to find any user
      systemUser = await User.findOne({});
      if (!systemUser) {
        console.warn("⚠️  No users found. Creating a temporary system user for seeding...");
        
        // Create a temporary system user for seeding purposes
        systemUser = new User({
          username: "system_seeder",
          email: "system@pusti.com",
          password: "temp_password_123",
          firstName: "System",
          lastName: "Seeder"
        });
        await systemUser.save();
        console.log("✅ Created temporary system user for seeding");
      }
    }

    console.log(`📝 Using system user: ${systemUser.username} (${systemUser.role?.role || 'No Role'})`);

    // Check if designations already exist
    const existingCount = await Designation.countDocuments();
    
    if (existingCount > 0) {
      console.log(`📊 Found ${existingCount} existing designations`);
      console.log("🔄 Clearing existing designations...");
      await Designation.deleteMany({});
    }

    // Create designations with audit fields
    const designationsToCreate = initialDesignations.map(designation => ({
      ...designation,
      createdBy: systemUser._id,
      updatedBy: systemUser._id
    }));

    console.log("💾 Creating designations...");
    
    // Insert designations
    const createdDesignations = await Designation.insertMany(designationsToCreate);
    
    console.log(`✅ Successfully created ${createdDesignations.length} designations:`);
    
    // Display created designations
    createdDesignations.forEach((designation, index) => {
      console.log(`   ${index + 1}. ${designation.name} (ID: ${designation._id})`);
    });

    // Verify seeding
    const finalCount = await Designation.countDocuments();
    const activeCount = await Designation.countDocuments({ active: true });
    
    console.log("\n📈 Seeding Summary:");
    console.log(`   Total designations: ${finalCount}`);
    console.log(`   Active designations: ${activeCount}`);
    console.log(`   Inactive designations: ${finalCount - activeCount}`);

    // Test the unique constraint
    console.log("\n🧪 Testing unique constraint...");
    try {
      const duplicate = new Designation({
        name: "Sales Admin", // This should fail
        createdBy: systemUser._id,
        updatedBy: systemUser._id
      });
      await duplicate.save();
      console.log("❌ Unique constraint test failed - duplicate was allowed!");
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log("✅ Unique constraint working correctly");
      } else {
        console.log("⚠️  Unexpected error during unique test:", error.message);
      }
    }

    // Test model methods
    console.log("\n🔍 Testing model methods...");
    const activeDesignations = await Designation.getActive();
    console.log(`   getActive() returned ${activeDesignations.length} designations`);

    const searchResults = await Designation.searchByName("Admin");
    console.log(`   searchByName("Admin") returned ${searchResults.length} results`);
    
    const salesAdminExists = await Designation.nameExists("Sales Admin");
    console.log(`   nameExists("Sales Admin") returned: ${salesAdminExists}`);

    console.log("\n🎉 Designation seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error during designation seeding:", error);
    throw error;
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    await connectDatabase();
    await seedDesignations();
    console.log("\n✨ All operations completed successfully!");
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    }
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log("\n⏹️  Process interrupted. Cleaning up...");
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("\n⏹️  Process terminated. Cleaning up...");
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { seedDesignations, initialDesignations };