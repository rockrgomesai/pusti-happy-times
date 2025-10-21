/**
 * Migration Script: Add active field to existing facilities
 * 
 * This script adds the 'active' field (default: true) to all existing facility documents
 * that don't already have it.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function migrate() {
  try {
    console.log('🔄 Starting migration: Add active field to facilities...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const facilitiesCollection = db.collection('facilities');

    // Count total facilities
    const totalFacilities = await facilitiesCollection.countDocuments();
    console.log(`📊 Total facilities found: ${totalFacilities}`);

    // Count facilities without active field
    const facilitiesWithoutActive = await facilitiesCollection.countDocuments({ active: { $exists: false } });
    console.log(`📊 Facilities without active field: ${facilitiesWithoutActive}`);

    if (facilitiesWithoutActive === 0) {
      console.log('✅ All facilities already have active field. No migration needed.');
      return;
    }

    // Update facilities without active field
    const result = await facilitiesCollection.updateMany(
      { active: { $exists: false } },
      { $set: { active: true } }
    );

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📊 Updated ${result.modifiedCount} facility/facilities with active: true`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
