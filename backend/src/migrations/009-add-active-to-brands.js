/**
 * Migration Script: Add active field to existing brands
 * 
 * This script adds the 'active' field (default: true) to all existing brand documents
 * that don't already have it.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function migrate() {
  try {
    console.log('🔄 Starting migration: Add active field to brands...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const brandsCollection = db.collection('brands');

    // Count total brands
    const totalBrands = await brandsCollection.countDocuments();
    console.log(`📊 Total brands found: ${totalBrands}`);

    // Count brands without active field
    const brandsWithoutActive = await brandsCollection.countDocuments({ active: { $exists: false } });
    console.log(`📊 Brands without active field: ${brandsWithoutActive}`);

    if (brandsWithoutActive === 0) {
      console.log('✅ All brands already have active field. No migration needed.');
      return;
    }

    // Update brands without active field
    const result = await brandsCollection.updateMany(
      { active: { $exists: false } },
      { $set: { active: true } }
    );

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📊 Updated ${result.modifiedCount} brand(s) with active: true`);

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
