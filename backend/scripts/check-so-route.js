/**
 * Check specific SO route assignments (Production)
 * 
 * Usage: node scripts/check-so-route.js <username>
 * Example: node scripts/check-so-route.js alamgir478
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function checkSORoute() {
  try {
    const username = process.argv[2];
    
    if (!username) {
      console.log('❌ Usage: node scripts/check-so-route.js <username>');
      console.log('   Example: node scripts/check-so-route.js alamgir478');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${MONGODB_URI.split('@')[1]?.split('?')[0] || 'localhost'}\n`);

    const User = require('../src/models/User');
    const Route = require('../src/models/Route');

    // Find the user
    const user = await User.findOne({ username }).lean();
    
    if (!user) {
      console.log(`❌ User "${username}" not found`);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('👤 User Found:');
    console.log(`   Username: ${user.username}`);
    console.log(`   ID: ${user._id.toString()}`);
    console.log(`   Name: ${user.full_name || 'N/A'}`);
    console.log(`   Role: ${user.role?.role || 'N/A'}`);
    console.log();

    // Find routes - check raw data first
    const routesRaw = await Route.find({
      $or: [
        { 'sr_assignments.sr_1.sr_id': user._id },
        { 'sr_assignments.sr_2.sr_id': user._id },
      ],
      active: true,
    }).lean();

    console.log(`🛣️  Found ${routesRaw.length} active routes (direct query)\n`);
    
    if (routesRaw.length === 0) {
      console.log('⚠️  No routes found with direct query. Checking ALL routes...\n');
      
      // Check all routes to see if any have this user in an object format
      const allRoutes = await Route.find({ active: true }).lean();
      console.log(`📋 Checking ${allRoutes.length} total active routes...\n`);
      
      let foundInObject = 0;
      
      for (const route of allRoutes) {
        let matches = false;
        
        // Check SR1
        const sr1 = route.sr_assignments?.sr_1?.sr_id;
        if (sr1) {
          if (typeof sr1 === 'object' && sr1._id && sr1._id.toString() === user._id.toString()) {
            console.log(`⚠️  Route ${route.route_id}: SR1 has user as OBJECT (needs fix)`);
            console.log(`     Object: ${JSON.stringify(sr1)}`);
            matches = true;
            foundInObject++;
          }
        }
        
        // Check SR2
        const sr2 = route.sr_assignments?.sr_2?.sr_id;
        if (sr2) {
          if (typeof sr2 === 'object' && sr2._id && sr2._id.toString() === user._id.toString()) {
            console.log(`⚠️  Route ${route.route_id}: SR2 has user as OBJECT (needs fix)`);
            console.log(`     Object: ${JSON.stringify(sr2)}`);
            matches = true;
            foundInObject++;
          }
        }
        
        if (matches) {
          console.log(`     Visit Days: ${route.sr_assignments?.sr_1?.visit_days?.join(', ') || route.sr_assignments?.sr_2?.visit_days?.join(', ') || 'NONE'}\n`);
        }
      }
      
      if (foundInObject > 0) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`❌ PROBLEM FOUND: ${foundInObject} routes have SR stored as OBJECT`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('💡 Solution: Run the fix script:');
        console.log('   node scripts/fix-route-sr-assignments.js\n');
      } else {
        console.log('✅ No routes found for this user anywhere\n');
      }
      
      await mongoose.connection.close();
      process.exit(0);
    }

    // Display route details
    routesRaw.forEach((route, index) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Route ${index + 1}: ${route.route_id}`);
      console.log(`Name: ${route.route_name}`);
      console.log();
      
      // Check SR1
      const sr1 = route.sr_assignments?.sr_1?.sr_id;
      const sr1Type = typeof sr1;
      const sr1IsObject = sr1Type === 'object' && sr1 !== null;
      
      console.log('SR1 Assignment:');
      console.log(`  Type: ${sr1Type}`);
      console.log(`  Value: ${sr1IsObject ? JSON.stringify(sr1).substring(0, 100) : sr1}`);
      console.log(`  Days: ${route.sr_assignments?.sr_1?.visit_days?.join(', ') || 'NONE'}`);
      
      if (sr1IsObject && sr1._id) {
        console.log(`  ⚠️  WARNING: Stored as object! Should be: ${sr1._id}`);
      }
      console.log();
      
      // Check SR2
      const sr2 = route.sr_assignments?.sr_2?.sr_id;
      const sr2Type = typeof sr2;
      const sr2IsObject = sr2Type === 'object' && sr2 !== null;
      
      console.log('SR2 Assignment:');
      console.log(`  Type: ${sr2Type}`);
      console.log(`  Value: ${sr2IsObject ? JSON.stringify(sr2).substring(0, 100) : sr2}`);
      console.log(`  Days: ${route.sr_assignments?.sr_2?.visit_days?.join(', ') || 'NONE'}`);
      
      if (sr2IsObject && sr2._id) {
        console.log(`  ⚠️  WARNING: Stored as object! Should be: ${sr2._id}`);
      }
      console.log();
      
      console.log(`Outlets: ${route.outlet_ids?.length || 0}`);
      console.log();
    });

    // Test day queries
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Testing Day-Based Queries (What Mobile App Uses):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const today = days[new Date().getDay()];
    
    for (const day of days) {
      const route = await Route.findOne({
        $or: [
          {
            'sr_assignments.sr_1.sr_id': user._id,
            'sr_assignments.sr_1.visit_days': { $in: [day] },
          },
          {
            'sr_assignments.sr_2.sr_id': user._id,
            'sr_assignments.sr_2.visit_days': { $in: [day] },
          },
        ],
        active: true,
      }).lean();
      
      const found = route ? `✅ ${route.route_id}` : '❌ NO ROUTE';
      const isToday = day === today ? ' ← TODAY' : '';
      console.log(`${day}: ${found}${isToday}`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkSORoute();
