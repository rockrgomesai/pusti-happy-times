const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function fixDistributorPermissions() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Get all distributor permissions
    const distributorPerms = await db.collection('api_permissions')
      .find({ 
        api_permissions: { 
          $in: ['distributors:read', 'distributors:create', 'distributors:update', 'distributors:delete'] 
        }
      })
      .toArray();

    console.log(`📋 Found ${distributorPerms.length} distributor permissions:`);
    distributorPerms.forEach(p => console.log(`   ${p.api_permissions} → ${p._id}`));

    // Get distributor_types:read permission
    const distributorTypesRead = await db.collection('api_permissions')
      .findOne({ api_permissions: 'distributor_types:read' });

    if (!distributorTypesRead) {
      console.error('\n❌ distributor_types:read permission not found!');
      return;
    }

    console.log(`\n📋 distributor_types:read → ${distributorTypesRead._id}`);

    // Check what's SuperAdmin's permissions look like
    console.log('\n📋 Checking SuperAdmin role_api_permissions structure:');
    const superAdmin = await db.collection('roles').findOne({ role: 'SuperAdmin' });
    const samplePerms = await db.collection('role_api_permissions')
      .find({ role_id: superAdmin._id })
      .limit(3)
      .toArray();
    
    console.log('Sample entries:');
    samplePerms.forEach(p => {
      console.log(`   role_id: ${p.role_id} (type: ${typeof p.role_id})`);
      console.log(`   permission_id: ${p.permission_id} (type: ${typeof p.permission_id})`);
      console.log(`   ---`);
    });

    // Check if SuperAdmin has distributor_types permissions
    console.log('\n📋 Checking SuperAdmin distributor_types permissions:');
    const hasDistributorTypes = await db.collection('role_api_permissions')
      .findOne({ 
        role_id: superAdmin._id,
        permission_id: distributorTypesRead._id
      });

    if (hasDistributorTypes) {
      console.log('✅ SuperAdmin already has distributor_types:read');
    } else {
      console.log('❌ SuperAdmin does NOT have distributor_types:read');
    }

    // Find roles that actually need distributor permissions
    // Check which roles can access /distributor page
    console.log('\n📋 Checking which roles have distributor access via menu or permissions:');
    
    // Simple approach: Grant to SuperAdmin, Sales Admin (common roles that manage distributors)
    const rolesToGrant = ['SuperAdmin', 'Sales Admin', 'ASM', 'RSM', 'ZSM', 'SO'];
    
    console.log(`\n🔧 Granting distributor_types:read to these roles:`);
    let granted = 0;

    for (const roleName of rolesToGrant) {
      const role = await db.collection('roles').findOne({ role: roleName });
      if (!role) {
        console.log(`   ⚠️  Role "${roleName}" not found`);
        continue;
      }

      // Check if already has permission
      const existing = await db.collection('role_api_permissions').findOne({
        role_id: role._id,
        permission_id: distributorTypesRead._id
      });

      if (existing) {
        console.log(`   ⏭️  ${roleName} - already has permission`);
        continue;
      }

      // Grant permission
      await db.collection('role_api_permissions').insertOne({
        role_id: role._id,
        permission_id: distributorTypesRead._id
      });

      granted++;
      console.log(`   ✅ ${roleName} - granted distributor_types:read`);
    }

    console.log(`\n✅ Successfully granted permission to ${granted} role(s)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

fixDistributorPermissions();
