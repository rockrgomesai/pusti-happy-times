const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';
const INPUT_DIR = path.join(__dirname, 'deployment_data');

async function importDeploymentData() {
  let connection;
  
  try {
    console.log('🚀 Starting deployment data import...\n');

    // Check if deployment_data directory exists
    if (!fs.existsSync(INPUT_DIR)) {
      throw new Error(`Deployment data directory not found: ${INPUT_DIR}`);
    }

    // Load metadata
    const metadataPath = path.join(INPUT_DIR, '_metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error('Metadata file not found. Please export data first.');
    }
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log('📋 Deployment Info:');
    console.log(`   Export Date: ${new Date(metadata.exportDate).toLocaleString()}`);
    console.log(`   Collections with data: ${metadata.collectionsWithData.length}`);
    console.log(`   Empty collections: ${metadata.emptyCollections.length}\n`);

    // Ask for confirmation (comment out in production)
    console.log('⚠️  WARNING: This will replace your database with deployment data!');
    console.log('   Make sure you have a backup if needed.\n');

    // Connect to MongoDB
    connection = await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Drop existing data from all collections
    console.log('🗑️  Step 1: Clearing existing data...\n');
    
    const allCollections = [...metadata.collectionsWithData, ...metadata.emptyCollections];
    
    for (const collectionName of allCollections) {
      try {
        const exists = await db.listCollections({ name: collectionName }).hasNext();
        if (exists) {
          await db.collection(collectionName).deleteMany({});
          console.log(`   ✓ Cleared ${collectionName}`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${collectionName}: ${error.message}`);
      }
    }

    // Step 2: Import data files
    console.log('\n📥 Step 2: Importing data...\n');
    
    const files = fs.readdirSync(INPUT_DIR).filter(f => 
      f.endsWith('.json') && !f.startsWith('_')
    );
    
    for (const file of files) {
      const collectionName = file.replace('.json', '');
      const filePath = path.join(INPUT_DIR, file);
      
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (data.length > 0) {
          await db.collection(collectionName).insertMany(data);
          console.log(`   ✓ ${collectionName}: Imported ${data.length} documents`);
        } else {
          console.log(`   ⚠️  ${collectionName}: No data to import`);
        }
      } catch (error) {
        console.log(`   ❌ ${collectionName}: ${error.message}`);
      }
    }

    // Step 3: Create empty collections and restore indexes
    console.log('\n🔧 Step 3: Creating empty collections and indexes...\n');
    
    const indexesPath = path.join(INPUT_DIR, '_indexes.json');
    if (fs.existsSync(indexesPath)) {
      const indexesData = JSON.parse(fs.readFileSync(indexesPath, 'utf8'));
      
      for (const [collectionName, indexes] of Object.entries(indexesData)) {
        try {
          // Create collection if it doesn't exist
          const exists = await db.listCollections({ name: collectionName }).hasNext();
          if (!exists) {
            await db.createCollection(collectionName);
          }
          
          // Create indexes
          if (indexes.length > 0) {
            for (const index of indexes) {
              const { key, ...options } = index;
              await db.collection(collectionName).createIndex(key, options);
            }
            console.log(`   ✓ ${collectionName}: Created ${indexes.length} indexes`);
          }
        } catch (error) {
          console.log(`   ⚠️  ${collectionName}: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Deployment data imported successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Collections imported: ${files.length}`);
    console.log(`   - Empty collections created: ${metadata.emptyCollections.length}`);
    console.log(`   - Database ready for production use`);

    console.log('\n🔐 IMPORTANT: Security Steps');
    console.log('1. Login as superadmin and change the default password');
    console.log('2. Create necessary user accounts');
    console.log('3. Configure production environment variables');
    console.log('4. Enable MongoDB authentication if not already enabled');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the import
importDeploymentData().catch(console.error);
