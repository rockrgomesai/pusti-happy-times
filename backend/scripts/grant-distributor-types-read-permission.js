const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function grantDistributorTypesReadPermission() {
  const client = new MongoClient(MONGODB_URI);

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const apiPermissionsCollection = db.collection('api_permissions');
    const roleApiPermissionsCollection = db.collection('role_api_permissions');
    const rolesCollection = db.collection('roles');

    // Find the distributor_types:read permission
    const readPermission = await apiPermissionsCollection.findOne({ 
      api_permissions: 'distributor_types:read' 
    });

    if (!readPermission) {
      console.error('❌ distributor_types:read permission not found. Run add-distributor-type-menu.js first');
      process.exit(1);
    }

    console.log(`✅ Found permission: ${readPermission.api_permissions} (${readPermission._id})`);

    // Find all permissions related to distributors
    const distributorPermissions = await apiPermissionsCollection.find({
      api_permissions: { 
        $in: ['distributors:read', 'distributors:create', 'distributors:update'] 
      }
    }).toArray();

    console.log(`\n📋 Found ${distributorPermissions.length} distributor-related permissions`);

    // Find roles that have any of these distributor permissions
    const rolesWithDistributorAccess = await roleApiPermissionsCollection.find({
      permission_id: { 
        $in: distributorPermissions.map(p => p._id) 
      }
    }).toArray();

    // Get unique role IDs
    const uniqueRoleIds = [...new Set(rolesWithDistributorAccess.map(r => r.role_id.toString()))];
    
    console.log(`📋 Found ${uniqueRoleIds.length} role(s) with distributor access:`);

    let updatedCount = 0;

    for (const roleIdStr of uniqueRoleIds) {
      const roleId = new ObjectId(roleIdStr);
      
      // Get role details
      const role = await rolesCollection.findOne({ _id: roleId });
      if (!role) {
        continue;
      }

      // Check if role already has distributor_types:read permission
      const hasPermission = await roleApiPermissionsCollection.findOne({
        role_id: roleId,
        permission_id: readPermission._id
      });

      if (hasPermission) {
        console.log(`   ⏭️  ${role.role} - already has permission`);
        continue;
      }

      // Add the permission
      await roleApiPermissionsCollection.insertOne({
        role_id: roleId,
        permission_id: readPermission._id
      });

      updatedCount++;
      console.log(`   ✅ ${role.role} - granted distributor_types:read`);
    }

    console.log(`\n✅ Successfully granted distributor_types:read to ${updatedCount} role(s)`);
    console.log('✅ All roles with distributor access can now read distributor types');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the function
grantDistributorTypesReadPermission();
