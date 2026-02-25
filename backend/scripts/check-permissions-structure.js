const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;

async function checkPermissionsStructure() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Check roles
    console.log('📋 ROLES:');
    const roles = await db.collection('roles').find({}).toArray();
    console.log(`Found ${roles.length} roles:`);
    roles.forEach(r => console.log(`   - ${r.role} (${r._id})`));

    // Check api_permissions
    console.log('\n📋 API PERMISSIONS (sample):');
    const apiPerms = await db.collection('api_permissions')
      .find({ api_permissions: { $regex: /^distributors?:/ } })
      .toArray();
    console.log(`Found ${apiPerms.length} distributor-related permissions:`);
    apiPerms.forEach(p => console.log(`   - ${p.api_permissions} (${p._id})`));

    // Check role_api_permissions
    console.log('\n📋 ROLE_API_PERMISSIONS:');
    const roleApiPerms = await db.collection('role_api_permissions')
      .find({})
      .limit(10)
      .toArray();
    console.log(`Found ${roleApiPerms.length} entries (showing first 10):`);
    
    for (const rap of roleApiPerms) {
      const role = await db.collection('roles').findOne({ _id: rap.role_id });
      const perm = await db.collection('api_permissions').findOne({ _id: rap.permission_id });
      console.log(`   - Role: ${role?.role || 'Unknown'} → Permission: ${perm?.api_permissions || 'Unknown'}`);
    }

    // Check SuperAdmin specifically
    console.log('\n📋 SUPERADMIN PERMISSIONS:');
    const superAdmin = await db.collection('roles').findOne({ role: 'SuperAdmin' });
    if (superAdmin) {
      const superAdminPerms = await db.collection('role_api_permissions')
        .find({ role_id: superAdmin._id })
        .toArray();
      console.log(`SuperAdmin has ${superAdminPerms.length} permissions`);
      
      const distributorRelated = [];
      for (const rap of superAdminPerms) {
        const perm = await db.collection('api_permissions').findOne({ _id: rap.permission_id });
        if (perm && perm.api_permissions.includes('distributor')) {
          distributorRelated.push(perm.api_permissions);
        }
      }
      console.log(`Distributor-related permissions: ${distributorRelated.length}`);
      distributorRelated.forEach(p => console.log(`   - ${p}`));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkPermissionsStructure();
