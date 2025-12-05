require('dotenv').config();
const { connectDB } = require('./src/config/database');
const mongoose = require('mongoose');

async function analyzeCollectionsForDeployment() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('=' .repeat(100));
    console.log('DATABASE DEPLOYMENT ANALYSIS - Collections to Keep vs Empty');
    console.log('='.repeat(100));
    
    // Categorize collections
    const categories = {
      systemData: {
        title: '🔵 SYSTEM/MASTER DATA - KEEP WITH DATA',
        desc: 'Essential system configuration, reference data, and master records',
        collections: []
      },
      businessMaster: {
        title: '🟢 BUSINESS MASTER DATA - KEEP WITH DATA',
        desc: 'Core business entities needed for system operation',
        collections: []
      },
      transactional: {
        title: '🟡 TRANSACTIONAL DATA - EMPTY FOR CLEAN START',
        desc: 'Operation records, orders, transactions that should start fresh',
        collections: []
      },
      userSpecific: {
        title: '🟠 USER/SESSION DATA - EMPTY OR RECREATE',
        desc: 'User-specific data, sessions, logs',
        collections: []
      },
      testData: {
        title: '🔴 TEST/DEVELOPMENT DATA - EMPTY',
        desc: 'Collections used only for testing',
        collections: []
      }
    };
    
    // Analyze each collection
    for (const coll of collections) {
      const name = coll.name;
      const count = await db.collection(name).countDocuments();
      const sampleDoc = await db.collection(name).findOne();
      
      const collInfo = {
        name,
        count,
        hasSampleData: !!sampleDoc,
        sampleFields: sampleDoc ? Object.keys(sampleDoc).slice(0, 5).join(', ') : 'empty'
      };
      
      // Categorize based on collection name patterns
      if (name.includes('api_permission') || name.includes('pg_permission') || 
          name.includes('sidebar_menu') || name === 'roles') {
        categories.systemData.collections.push(collInfo);
      }
      else if (name === 'users') {
        categories.userSpecific.collections.push(collInfo);
      }
      else if (name === 'territories' || name === 'facilities' || name === 'brands' || 
               name === 'products' || name === 'transports' || name === 'distributors' ||
               name === 'routes' || name === 'route_schedules') {
        categories.businessMaster.collections.push(collInfo);
      }
      else if (name.includes('order') || name.includes('chalan') || name.includes('invoice') ||
               name.includes('transaction') || name.includes('stock') || name.includes('ledger') ||
               name.includes('loadsheet') || name === 'loadsheets') {
        categories.transactional.collections.push(collInfo);
      }
      else if (name.includes('session') || name.includes('token') || name.includes('log')) {
        categories.userSpecific.collections.push(collInfo);
      }
      else {
        // Default to transactional for safety
        categories.transactional.collections.push(collInfo);
      }
    }
    
    // Print categorized results
    for (const category of Object.values(categories)) {
      if (category.collections.length === 0) continue;
      
      console.log('\n' + category.title);
      console.log(category.desc);
      console.log('-'.repeat(100));
      
      for (const coll of category.collections) {
        const status = coll.count === 0 ? '(EMPTY)' : `(${coll.count} docs)`;
        console.log(`   ${coll.name.padEnd(40)} ${status.padEnd(20)} ${coll.sampleFields.substring(0, 30)}`);
      }
    }
    
    // Summary recommendations
    console.log('\n\n' + '='.repeat(100));
    console.log('📋 DEPLOYMENT RECOMMENDATIONS');
    console.log('='.repeat(100));
    
    console.log('\n✅ KEEP DATA IN THESE COLLECTIONS:');
    console.log('-'.repeat(100));
    [...categories.systemData.collections, ...categories.businessMaster.collections].forEach(c => {
      console.log(`   ✓ ${c.name} (${c.count} docs)`);
    });
    
    console.log('\n\n🗑️  EMPTY/TRUNCATE THESE COLLECTIONS:');
    console.log('-'.repeat(100));
    [...categories.transactional.collections, ...categories.userSpecific.collections, ...categories.testData.collections].forEach(c => {
      console.log(`   ✗ ${c.name} (currently ${c.count} docs)`);
    });
    
    console.log('\n\n⚠️  SPECIAL CONSIDERATIONS:');
    console.log('-'.repeat(100));
    console.log('   • users: Keep ONLY superadmin/system accounts, remove test users');
    console.log('   • distributors: Keep if they are real business entities, empty if test data');
    console.log('   • products: Keep if already configured with real SKUs');
    console.log('   • territories/facilities: Keep if configured for actual business locations');
    console.log('   • brands: Keep if configured with real brand data');
    
    await mongoose.disconnect();
    console.log('\n\n✅ Analysis complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

analyzeCollectionsForDeployment();
