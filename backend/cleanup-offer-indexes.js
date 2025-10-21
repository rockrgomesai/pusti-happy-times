const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function cleanupIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');

    // Obsolete indexes to remove
    const obsoleteIndexes = ['approval_status_1', 'priority_1'];

    console.log('\nRemoving obsolete indexes...');
    for (const indexName of obsoleteIndexes) {
      try {
        await offersCollection.dropIndex(indexName);
        console.log(`✅ Dropped ${indexName}`);
      } catch (error) {
        if (error.code === 27 || error.codeName === 'IndexNotFound') {
          console.log(`ℹ️  ${indexName} does not exist`);
        } else {
          console.error(`❌ Error dropping ${indexName}:`, error.message);
        }
      }
    }

    // Show final indexes
    console.log('\nFinal indexes on offers collection:');
    const finalIndexes = await offersCollection.indexes();
    finalIndexes.forEach(index => {
      console.log('- ', index.name, ':', JSON.stringify(index.key));
    });

    console.log('\n✅ Cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupIndexes();
