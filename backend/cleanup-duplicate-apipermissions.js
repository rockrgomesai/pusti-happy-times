const mongoose = require('mongoose');

async function cleanupDuplicateCollection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/pusti_happy_times');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Check if both collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const hasApiPermissions = collectionNames.includes('api_permissions');
    const hasApipermissions = collectionNames.includes('apipermissions');
    
    console.log('📋 Collection Status:');
    console.log(`   api_permissions (correct): ${hasApiPermissions ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   apipermissions (duplicate): ${hasApipermissions ? '⚠️  EXISTS' : '✅ CLEAN'}`);
    console.log('');
    
    if (!hasApipermissions) {
      console.log('✨ No duplicate collection found. Database is clean!');
      await mongoose.disconnect();
      return;
    }
    
    // Count documents in each collection
    const apiPermissionsCount = hasApiPermissions 
      ? await db.collection('api_permissions').countDocuments() 
      : 0;
    const apipermissionsCount = await db.collection('apipermissions').countDocuments();
    
    console.log('📊 Document Counts:');
    console.log(`   api_permissions: ${apiPermissionsCount} documents`);
    console.log(`   apipermissions: ${apipermissionsCount} documents`);
    console.log('');
    
    if (apipermissionsCount === 0) {
      console.log('🗑️  Duplicate collection is empty, safe to delete...');
      await db.collection('apipermissions').drop();
      console.log('✅ Deleted empty duplicate collection: apipermissions');
      await mongoose.disconnect();
      return;
    }
    
    // Check if there's any data that needs migration
    console.log('🔍 Analyzing duplicate collection data...');
    const duplicateDocs = await db.collection('apipermissions').find().toArray();
    
    if (!hasApiPermissions) {
      console.log('⚠️  Main collection does not exist! Renaming duplicate to correct name...');
      await db.collection('apipermissions').rename('api_permissions');
      console.log('✅ Renamed apipermissions → api_permissions');
      await mongoose.disconnect();
      return;
    }
    
    // Get all api_permissions keys to check for conflicts
    const mainDocs = await db.collection('api_permissions').find().toArray();
    const mainKeys = new Set(mainDocs.map(doc => doc.api_permissions));
    
    const duplicatesToMigrate = duplicateDocs.filter(doc => !mainKeys.has(doc.api_permissions));
    const duplicatesAlreadyExist = duplicateDocs.filter(doc => mainKeys.has(doc.api_permissions));
    
    console.log('');
    console.log('📈 Migration Analysis:');
    console.log(`   Documents unique to duplicate: ${duplicatesToMigrate.length}`);
    console.log(`   Documents already in main: ${duplicatesAlreadyExist.length}`);
    console.log('');
    
    if (duplicatesToMigrate.length > 0) {
      console.log('⚠️  Found unique permissions in duplicate collection:');
      duplicatesToMigrate.forEach(doc => {
        console.log(`   - ${doc.api_permissions}`);
      });
      console.log('');
      console.log('🔄 Migrating unique permissions to main collection...');
      
      for (const doc of duplicatesToMigrate) {
        await db.collection('api_permissions').insertOne({
          api_permissions: doc.api_permissions,
          _id: doc._id
        });
        console.log(`   ✅ Migrated: ${doc.api_permissions}`);
      }
    }
    
    if (duplicatesAlreadyExist.length > 0) {
      console.log('ℹ️  Permissions already existing in main collection:');
      duplicatesAlreadyExist.forEach(doc => {
        console.log(`   - ${doc.api_permissions}`);
      });
    }
    
    console.log('');
    console.log('🗑️  Deleting duplicate collection...');
    await db.collection('apipermissions').drop();
    console.log('✅ Successfully deleted duplicate collection: apipermissions');
    
    // Verify final state
    const finalCount = await db.collection('api_permissions').countDocuments();
    console.log('');
    console.log('✨ Cleanup Complete!');
    console.log(`   Final api_permissions count: ${finalCount} documents`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDuplicateCollection();
