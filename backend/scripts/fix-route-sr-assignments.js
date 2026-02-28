/**
 * Fix Route SR Assignments - Extract ObjectId from populated objects
 * 
 * Problem: Routes may have sr_id stored as populated objects instead of ObjectId strings
 * Solution: Extract just the _id and save it properly
 * 
 * Run this in production after deploying the frontend fix
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function fixRouteAssignments() {
  try {
    console.log('🔧 Starting Route SR Assignment Fix...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${MONGODB_URI.split('@')[1]?.split('?')[0] || 'localhost'}\n`);

    const Route = require('../src/models/Route');

    // Find all routes
    const routes = await Route.find({}).lean();
    console.log(`📋 Found ${routes.length} total routes\n`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errors = [];

    for (const route of routes) {
      let needsUpdate = false;
      const updates = {};

      // Check SR1
      const sr1 = route.sr_assignments?.sr_1?.sr_id;
      if (sr1 && typeof sr1 === 'object' && sr1._id) {
        // It's a populated object, extract the _id
        updates['sr_assignments.sr_1.sr_id'] = sr1._id;
        needsUpdate = true;
        console.log(`🔧 Route ${route.route_id}: Fixing SR1 (extracting _id from object)`);
      }

      // Check SR2
      const sr2 = route.sr_assignments?.sr_2?.sr_id;
      if (sr2 && typeof sr2 === 'object' && sr2._id) {
        // It's a populated object, extract the _id
        updates['sr_assignments.sr_2.sr_id'] = sr2._id;
        needsUpdate = true;
        console.log(`🔧 Route ${route.route_id}: Fixing SR2 (extracting _id from object)`);
      }

      if (needsUpdate) {
        try {
          await Route.updateOne({ _id: route._id }, { $set: updates });
          fixedCount++;
          console.log(`   ✅ Updated successfully\n`);
        } catch (err) {
          console.error(`   ❌ Error updating: ${err.message}\n`);
          errors.push({ route: route.route_id, error: err.message });
        }
      } else {
        alreadyCorrectCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Routes: ${routes.length}`);
    console.log(`✅ Fixed: ${fixedCount}`);
    console.log(`✓  Already Correct: ${alreadyCorrectCount}`);
    console.log(`❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(e => console.log(`   - ${e.route}: ${e.error}`));
    }

    console.log('\n✅ Migration complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test mobile app login with SO alamgir478');
    console.log('   2. Try "Mark Attendance" - should show route for correct day');
    console.log('   3. Try "Trace Route" - should show route for correct day');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixRouteAssignments();
