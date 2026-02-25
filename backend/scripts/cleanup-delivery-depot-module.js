const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function cleanupDeliveryDepotModule() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // 1. Find and delete the menu item
    console.log('📋 Step 1: Removing menu item...');
    const menuCollection = db.collection('sidebar_menu_items');
    const menuItem = await menuCollection.findOne({ 
      label: 'Delivery Depot',
      href: '/distributor/delivery-depots'
    });

    if (menuItem) {
      console.log(`   Found menu item: ${menuItem._id}`);
      
      // Delete role_sidebar_menu_items entries
      const roleMenuCollection = db.collection('role_sidebar_menu_items');
      const roleMenuDeleted = await roleMenuCollection.deleteMany({
        sidebar_menu_item_id: menuItem._id
      });
      console.log(`   ✅ Deleted ${roleMenuDeleted.deletedCount} role menu assignments`);

      // Delete the menu item itself
      await menuCollection.deleteOne({ _id: menuItem._id });
      console.log('   ✅ Deleted menu item');
    } else {
      console.log('   ⏭️  Menu item not found (already deleted or never created)');
    }

    // 2. Find and delete API permissions
    console.log('\n📋 Step 2: Removing API permissions...');
    const apiPermCollection = db.collection('api_permissions');
    const permissions = await apiPermCollection.find({
      api_permissions: { $regex: /^delivery_depots:/ }
    }).toArray();

    if (permissions.length > 0) {
      console.log(`   Found ${permissions.length} delivery depot permissions`);
      
      // Delete role_api_permissions entries
      const roleApiPermCollection = db.collection('role_api_permissions');
      const permissionIds = permissions.map(p => p._id);
      const rolePermDeleted = await roleApiPermCollection.deleteMany({
        api_permission_id: { $in: permissionIds }
      });
      console.log(`   ✅ Deleted ${rolePermDeleted.deletedCount} role permission assignments`);

      // Delete the permissions themselves
      const permDeleted = await apiPermCollection.deleteMany({
        api_permissions: { $regex: /^delivery_depots:/ }
      });
      console.log(`   ✅ Deleted ${permDeleted.deletedCount} API permissions`);
    } else {
      console.log('   ⏭️  No permissions found (already deleted or never created)');
    }

    // 3. Delete delivery depot data
    console.log('\n📋 Step 3: Removing delivery depot data...');
    const depotsCollection = db.collection('delivery_depots');
    const depotCount = await depotsCollection.countDocuments();
    
    if (depotCount > 0) {
      const result = await depotsCollection.deleteMany({});
      console.log(`   ✅ Deleted ${result.deletedCount} delivery depot records`);
    } else {
      console.log('   ⏭️  No delivery depots found (already deleted or never created)');
    }

    console.log('\n✅ Cleanup completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Menu item and assignments removed');
    console.log('   - API permissions and role assignments removed');
    console.log('   - All delivery depot data removed');
    console.log('\n⚠️  Note: The delivery_depots collection still exists (empty)');
    console.log('   You can drop it manually if needed: db.delivery_depots.drop()');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the cleanup function
cleanupDeliveryDepotModule();
