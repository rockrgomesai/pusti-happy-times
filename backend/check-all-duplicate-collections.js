require('dotenv').config();
const { connectDB } = require('./src/config/database');
const mongoose = require('mongoose');

async function checkAllCollections() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const collectionPairs = [
      { correct: 'pg_permissions', duplicates: ['page_permissions'] },
      { correct: 'role_pg_permissions', duplicates: ['role_page_permissions'] },
      { correct: 'role_api_permissions', duplicates: ['roleapipermissions', 'roles_api_permissions'] },
      { correct: 'role_sidebar_menu_items', duplicates: ['rolesidebarmenuitems'] },
      { correct: 'sidebar_menu_items', duplicates: ['sidebarmenuitems'] },
      { correct: 'load_sheets', duplicates: ['loadsheets'] },
    ];
    
    console.log('📋 Collection Status Report\n');
    console.log('='.repeat(80));
    
    for (const pair of collectionPairs) {
      console.log(`\n🔍 ${pair.correct.toUpperCase()}`);
      
      const hasCorrect = collectionNames.includes(pair.correct);
      const correctCount = hasCorrect ? await db.collection(pair.correct).countDocuments() : 0;
      
      console.log(`   ✅ ${pair.correct}: ${hasCorrect ? `EXISTS (${correctCount} docs)` : '❌ NOT FOUND'}`);
      
      for (const dup of pair.duplicates) {
        const hasDup = collectionNames.includes(dup);
        if (hasDup) {
          const dupCount = await db.collection(dup).countDocuments();
          console.log(`   ⚠️  ${dup}: EXISTS (${dupCount} docs) - DUPLICATE`);
        } else {
          console.log(`   ✅ ${dup}: CLEAN`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Check model definitions
    console.log('\n🔍 Checking Model Definitions...\n');
    const models = require('./src/models');
    
    const modelChecks = [
      { name: 'PagePermission', field: 'pg_permissions' },
      { name: 'RolePagePermission', field: 'role_pg_permissions' },
      { name: 'RoleApiPermission', field: 'role_api_permissions' },
      { name: 'RoleSidebarMenuItem', field: 'role_sidebar_menu_items' },
      { name: 'SidebarMenuItem', field: 'sidebar_menu_items' },
      { name: 'LoadSheet', field: 'load_sheets' },
    ];
    
    for (const check of modelChecks) {
      if (models[check.name]) {
        console.log(`   ${check.name}: ✅ EXISTS → ${models[check.name].collection.name}`);
      } else {
        console.log(`   ${check.name}: ❌ NOT FOUND`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkAllCollections();
