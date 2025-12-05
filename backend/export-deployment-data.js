const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';
const OUTPUT_DIR = path.join(__dirname, 'deployment_data');

// Collections to export (system config + real business data)
const COLLECTIONS_TO_EXPORT = [
  'api_permissions',
  'pg_permissions',
  'role_api_permissions',
  'role_pg_permissions',
  'role_sidebar_menu_items',
  'sidebar_menu_items',
  'roles',
  'bd_banks',
  'banks'
];

// Collections to keep structure only (will be empty)
const EMPTY_COLLECTIONS = [
  'users', // Will keep only superadmin
  'territories',
  'facilities',
  'facility_employees',
  'brands',
  'categories',
  'products',
  'product_prices',
  'distributors',
  'distributor_stocks',
  'transports',
  'demandorders',
  'demandorderitems',
  'loadsheets',
  'loadsheetitems',
  'deliverychalans',
  'deliverychalanproducts',
  'depot_stocks',
  'depot_transactions_in',
  'depot_transactions_out',
  'distributor_returns',
  'distributor_return_items',
  'production_batches',
  'production_batch_items',
  'inventory_receives',
  'inventory_receive_items',
  'stock_adjustments',
  'offers',
  'offerdiscounts',
  'sessions',
  'notifications',
  'audit_logs',
  'system_settings'
];

async function exportDeploymentData() {
  let connection;
  
  try {
    console.log('🚀 Starting deployment data export for Git...\n');

    // Create output directory
    if (fs.existsSync(OUTPUT_DIR)) {
      console.log('⚠️  Clearing existing deployment_data directory...');
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Connect to MongoDB
    connection = await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Export collections with data
    console.log('📦 Step 1: Exporting collections with data...\n');
    
    for (const collectionName of COLLECTIONS_TO_EXPORT) {
      try {
        const collection = db.collection(collectionName);
        const data = await collection.find({}).toArray();
        
        const filePath = path.join(OUTPUT_DIR, `${collectionName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        console.log(`   ✓ ${collectionName}: ${data.length} documents`);
      } catch (error) {
        console.log(`   ⚠️  ${collectionName}: Collection not found, skipping`);
      }
    }

    // Step 2: Export superadmin user only
    console.log('\n📦 Step 2: Exporting superadmin user...\n');
    
    const users = db.collection('users');
    const superadmin = await users.findOne({ 
      $or: [
        { role_name: 'Superadmin' },
        { email: 'superadmin@pusti.com' }
      ]
    });
    
    if (superadmin) {
      const filePath = path.join(OUTPUT_DIR, 'users.json');
      fs.writeFileSync(filePath, JSON.stringify([superadmin], null, 2));
      console.log(`   ✓ users: 1 document (superadmin only)`);
    } else {
      console.log('   ⚠️  Superadmin user not found!');
    }

    // Step 3: Export indexes for all collections
    console.log('\n📦 Step 3: Exporting indexes...\n');
    
    const allCollections = await db.listCollections().toArray();
    const indexesData = {};
    
    for (const collInfo of allCollections) {
      const collName = collInfo.name;
      if (collName.startsWith('system.')) continue;
      
      try {
        const indexes = await db.collection(collName).indexes();
        // Remove _id index as it's created automatically
        indexesData[collName] = indexes.filter(idx => idx.name !== '_id_');
      } catch (error) {
        console.log(`   ⚠️  ${collName}: Could not get indexes`);
      }
    }
    
    const indexesFilePath = path.join(OUTPUT_DIR, '_indexes.json');
    fs.writeFileSync(indexesFilePath, JSON.stringify(indexesData, null, 2));
    console.log(`   ✓ Exported indexes for ${Object.keys(indexesData).length} collections`);

    // Step 4: Export metadata
    console.log('\n📦 Step 4: Creating metadata...\n');
    
    const metadata = {
      exportDate: new Date().toISOString(),
      collectionsWithData: [...COLLECTIONS_TO_EXPORT, 'users'],
      emptyCollections: EMPTY_COLLECTIONS,
      totalCollections: allCollections.length,
      note: 'This is a deployment-ready database export. Import using import-deployment-data.js'
    };
    
    const metadataPath = path.join(OUTPUT_DIR, '_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('   ✓ Created metadata file');

    console.log('\n✅ Deployment data exported successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Output directory: ${OUTPUT_DIR}`);
    console.log(`   - Collections with data: ${COLLECTIONS_TO_EXPORT.length + 1}`);
    console.log(`   - Empty collections: ${EMPTY_COLLECTIONS.length}`);
    console.log(`   - Total files: ${fs.readdirSync(OUTPUT_DIR).length}`);

    console.log('\n📦 Next steps:');
    console.log('1. Review files in: backend/deployment_data/');
    console.log('2. Commit to Git:');
    console.log('   git add backend/deployment_data/');
    console.log('   git commit -m "Add deployment database exports"');
    console.log('   git push origin main');
    console.log('\n3. On Contabo server:');
    console.log('   git pull origin main');
    console.log('   node backend/import-deployment-data.js');

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

// Run the export
exportDeploymentData().catch(console.error);
