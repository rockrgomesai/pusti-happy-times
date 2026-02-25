const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function addDeliveryDepotMenu() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // 1. Find the Distributor parent menu
    const menuCollection = db.collection('sidebar_menu_items');
    const distributorParent = await menuCollection.findOne({ 
      label: 'Distributor',
      parent_id: null 
    });

    if (!distributorParent) {
      console.error('❌ Distributor parent menu not found');
      process.exit(1);
    }

    console.log(`✅ Found Distributor parent menu (${distributorParent._id})`);

    // 2. Check if menu item already exists
    const existingMenu = await menuCollection.findOne({ 
      label: 'Delivery Depot',
      parent_id: distributorParent._id 
    });

    let menuId;
    if (existingMenu) {
      console.log('⚠️  Delivery Depot menu item already exists');
      menuId = existingMenu._id;
    } else {
      // Get the highest m_order under Distributor parent
      const siblings = await menuCollection
        .find({ parent_id: distributorParent._id })
        .sort({ m_order: -1 })
        .limit(1)
        .toArray();
      
      const nextOrder = siblings.length > 0 ? siblings[0].m_order + 1 : 603;

      // Create menu item
      const menuItem = {
        label: 'Delivery Depot',
        href: '/distributor/delivery-depots',
        m_order: nextOrder,
        icon: 'LocationOn',
        parent_id: distributorParent._id,
        is_submenu: true,
      };

      const menuResult = await menuCollection.insertOne(menuItem);
      menuId = menuResult.insertedId;
      console.log(`✅ Created menu item with ID: ${menuId} (order: ${nextOrder})`);
    }

    // 3. Grant menu access to SuperAdmin role
    const rolesCollection = db.collection('roles');
    const superAdmin = await rolesCollection.findOne({ role: 'SuperAdmin' });

    if (superAdmin) {
      const roleMenuCollection = db.collection('role_sidebar_menu_items');
      const existingRoleMenu = await roleMenuCollection.findOne({
        role_id: superAdmin._id,
        sidebar_menu_item_id: menuId,
      });

      if (!existingRoleMenu) {
        await roleMenuCollection.insertOne({
          role_id: superAdmin._id,
          sidebar_menu_item_id: menuId,
        });
        console.log('✅ Granted menu access to SuperAdmin');
      } else {
        console.log('⏭️  SuperAdmin already has menu access');
      }
    }

    // 4. Create API permissions
    const apiPermCollection = db.collection('api_permissions');
    const permissions = [
      { api_permissions: 'delivery_depots:read' },
      { api_permissions: 'delivery_depots:create' },
      { api_permissions: 'delivery_depots:update' },
      { api_permissions: 'delivery_depots:delete' },
    ];

    console.log('\n📋 Creating API permissions:');
    const permissionIds = [];

    for (const perm of permissions) {
      const existingPerm = await apiPermCollection.findOne({ api_permissions: perm.api_permissions });
      
      if (existingPerm) {
        console.log(`⚠️  Permission already exists: ${perm.api_permissions}`);
        permissionIds.push(existingPerm._id);
      } else {
        const result = await apiPermCollection.insertOne(perm);
        permissionIds.push(result.insertedId);
        console.log(`✅ Created permission: ${perm.api_permissions}`);
      }
    }

    // 5. Grant all API permissions to SuperAdmin
    if (superAdmin) {
      const roleApiPermCollection = db.collection('role_api_permissions');
      console.log('\n📋 Granting permissions to SuperAdmin:');

      for (let i = 0; i < permissionIds.length; i++) {
        const permId = permissionIds[i];
        const existing = await roleApiPermCollection.findOne({
          role_id: superAdmin._id,
          api_permission_id: permId,
        });

        if (!existing) {
          await roleApiPermCollection.insertOne({
            role_id: superAdmin._id,
            api_permission_id: permId,
          });
          console.log(`   ✅ Granted ${permissions[i].api_permissions}`);
        } else {
          console.log(`   ⏭️  Already granted ${permissions[i].api_permissions}`);
        }
      }
    }

    // 6. Grant READ permission to sales roles (same as distributor_types)
    const salesRoles = ['Sales Admin', 'ASM', 'RSM', 'ZSM', 'SO'];
    const readPermission = await apiPermCollection.findOne({ 
      api_permissions: 'delivery_depots:read' 
    });

    if (readPermission) {
      console.log('\n📋 Granting read permission to sales roles:');
      const roleApiPermCollection = db.collection('role_api_permissions');

      for (const roleName of salesRoles) {
        const role = await rolesCollection.findOne({ role: roleName });
        if (!role) {
          console.log(`   ⚠️  Role "${roleName}" not found`);
          continue;
        }

        const existing = await roleApiPermCollection.findOne({
          role_id: role._id,
          api_permission_id: readPermission._id,
        });

        if (!existing) {
          await roleApiPermCollection.insertOne({
            role_id: role._id,
            api_permission_id: readPermission._id,
          });
          console.log(`   ✅ ${roleName} - granted delivery_depots:read`);
        } else {
          console.log(`   ⏭️  ${roleName} - already has permission`);
        }
      }
    }

    console.log('\n✅ Setup completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Menu item created/verified under Distributor menu');
    console.log('   - 4 API permissions created (read, create, update, delete)');
    console.log('   - SuperAdmin granted full access');
    console.log('   - Sales roles granted read access');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the function
addDeliveryDepotMenu();
