// Create DSR API permissions
// Run this with: node create-dsr-permissions.js

const mongoose = require('mongoose');

async function createDSRPermissions() {
  try {
    await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const apiPermissionsCollection = db.collection('api_permissions');
    const roleApiPermissionsCollection = db.collection('role_api_permissions');
    const rolesCollection = db.collection('roles');

    // Define DSR permissions
    const dsrPermissions = [
      { api_permissions: 'dsr:create' },
      { api_permissions: 'dsr:read' },
      { api_permissions: 'dsr:update' },
      { api_permissions: 'dsr:delete' },
      { api_permissions: 'dsr:create_user' },
    ];

    console.log('\n📋 Creating DSR API permissions...');
    const createdPermissions = [];
    
    for (const permData of dsrPermissions) {
      const existing = await apiPermissionsCollection.findOne({ api_permissions: permData.api_permissions });
      
      if (!existing) {
        const result = await apiPermissionsCollection.insertOne(permData);
        createdPermissions.push({ _id: result.insertedId, ...permData });
        console.log(`✅ Created ${permData.api_permissions} permission`);
      } else {
        createdPermissions.push(existing);
        console.log(`⚠️  ${permData.api_permissions} permission already exists`);
      }
    }

    // Assign all DSR permissions to admin roles and Distributor role
    const rolesToAssign = ['SuperAdmin', 'Sales Admin', 'Office Admin', 'MIS', 'Distributor'];
    
    console.log('\n📋 Assigning DSR permissions to roles...');
    for (const roleName of rolesToAssign) {
      const role = await rolesCollection.findOne({ role: roleName });
      
      if (!role) {
        console.log(`❌ Role ${roleName} not found`);
        continue;
      }

      for (const permission of createdPermissions) {
        const existing = await roleApiPermissionsCollection.findOne({
          role_id: role._id,
          api_permission_id: permission._id
        });

        if (!existing) {
          await roleApiPermissionsCollection.insertOne({
            role_id: role._id,
            api_permission_id: permission._id
          });
          console.log(`✅ Assigned ${permission.api_permissions} to ${roleName}`);
        } else {
          console.log(`⚠️  ${permission.api_permissions} already assigned to ${roleName}`);
        }
      }
    }

    // Display summary
    console.log('\n📋 DSR Permissions Summary:');
    const allDSRPerms = await apiPermissionsCollection.find({
      api_permissions: { $regex: /^dsr:/ }
    }).toArray();

    allDSRPerms.forEach(perm => {
      console.log(`  ● ${perm.api_permissions}`);
    });

    console.log('\n✅ DSR API permissions created and assigned successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

createDSRPermissions();
