const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function dropOfferCodeIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');

    // Check existing indexes
    console.log('\nExisting indexes on offers collection:');
    const indexes = await offersCollection.indexes();
    indexes.forEach(index => {
      console.log('- ', index.name, ':', JSON.stringify(index.key));
    });

    // Drop the offer_code_1 index if it exists
    try {
      console.log('\nDropping offer_code_1 index...');
      await offersCollection.dropIndex('offer_code_1');
      console.log('✅ Successfully dropped offer_code_1 index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index offer_code_1 does not exist (already dropped or never created)');
      } else {
        throw error;
      }
    }

    // Show indexes after dropping
    console.log('\nRemaining indexes on offers collection:');
    const remainingIndexes = await offersCollection.indexes();
    remainingIndexes.forEach(index => {
      console.log('- ', index.name, ':', JSON.stringify(index.key));
    });

    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    process.exit(1);
  }
}

dropOfferCodeIndex();
