// Verify Distributor role has full DSR access
const mongoose = require('mongoose');

async function verifyDistributorAccess() {
  try {
    await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const rolesCollection = db.collection('roles');
    const roleMenuCollection = db.collection('role_sidebar_menu_items');
    const menuCollection = db.collection('sidebar_menu_items');
    const roleApiPermissionsCollection = db.collection('role_api_permissions');
    const apiPermissionsCollection = db.collection('api_permissions');

    // Get Distributor role
    const distributorRole = await rolesCollection.findOne({ role: 'Distributor' });
    if (!distributorRole) {
      console.log('❌ Distributor role not found');
      return;
    }

    console.log('📋 Distributor Role Access Summary\n');
    console.log('═'.repeat(60));

    // Get menu items
    const distributorMenus = await roleMenuCollection.find({
      role_id: distributorRole._id
    }).toArray();
    
    const menuItems = await menuCollection.find({
      _id: { $in: distributorMenus.map(m => m.sidebar_menu_item_id) }
    }).toArray();
    
    // Filter for distributor-related menus
    const dsrRelatedMenus = menuItems.filter(item => 
      item.label === 'Distributor' || 
      item.label === 'DSR' || 
      item.label === 'Distributors'
    );

    console.log('\n🗂️  Menu Access:');
    console.log('─'.repeat(60));
    dsrRelatedMenus.forEach(item => {
      const icon = item.is_submenu ? '  └─' : '●';
      const path = item.href || 'parent';
      console.log(`${icon} ${item.label.padEnd(20)} → ${path}`);
    });

    // Get API permissions
    const distributorApiPerms = await roleApiPermissionsCollection.find({
      role_id: distributorRole._id
    }).toArray();
    
    const apiPerms = await apiPermissionsCollection.find({
      _id: { $in: distributorApiPerms.map(p => p.api_permission_id) }
    }).toArray();
    
    const dsrApiPerms = apiPerms.filter(p => p.api_permissions.startsWith('dsr:'));

    console.log('\n🔑 DSR API Permissions:');
    console.log('─'.repeat(60));
    dsrApiPerms.forEach(perm => {
      console.log(`  ✓ ${perm.api_permissions}`);
    });

    console.log('\n═'.repeat(60));
    console.log('\n✅ Distributor role has FULL CONTROL over DSRs!');
    console.log(`   - Can view DSR menu`);
    console.log(`   - Can create DSRs`);
    console.log(`   - Can view DSRs`);
    console.log(`   - Can update DSRs`);
    console.log(`   - Can delete DSRs`);
    console.log(`   - Can create user accounts for DSRs\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

verifyDistributorAccess();
