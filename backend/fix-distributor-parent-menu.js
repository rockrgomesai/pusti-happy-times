// Fix Distributor parent menu to be accordion-only (no navigation)
// Run with: node fix-distributor-parent-menu.js

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function fixDistributorParentMenu() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const menuCollection = db.collection('sidebar_menu_items');

    console.log('🔧 Fixing Distributor parent menu...\n');

    // Find the Distributor parent menu
    const distributorParent = await menuCollection.findOne({
      label: 'Distributor',
      parent_id: null
    });

    if (!distributorParent) {
      console.log('❌ Distributor parent menu not found');
      return;
    }

    console.log('📋 Current state:');
    console.log(`   href: ${distributorParent.href}`);
    console.log(`   is_submenu: ${distributorParent.is_submenu}`);
    console.log(`   parent_id: ${distributorParent.parent_id}`);

    // Update to remove href (make it accordion-only, not navigable)
    await menuCollection.updateOne(
      { _id: distributorParent._id },
      { 
        $set: { 
          href: null,  // This is the key change!
          parent_id: null,
          is_submenu: false
        }
      }
    );

    console.log('\n✅ Updated Distributor parent menu:');
    console.log('   href: null (accordion only, not navigable)');
    console.log('   is_submenu: false');
    console.log('   parent_id: null');

    console.log('\n📝 Result:');
    console.log('   - Clicking "Distributor" will expand/collapse children');
    console.log('   - No navigation/routing will occur');
    console.log('   - Children (Distributors, DSR) will be visible when expanded');

    console.log('\n⚠️  Important:');
    console.log('   - Users must refresh browser (Ctrl+F5)');
    console.log('   - May need to clear cache and log out/in');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB\n');
  }
}

fixDistributorParentMenu();
