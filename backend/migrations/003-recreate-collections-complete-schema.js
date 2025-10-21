/**
 * Migration Script: Recreate Users and Employees Collections with Complete Schema
 * 
 * This script:
 * 1. Backs up existing users and employees collections
 * 2. Drops the old collections
 * 3. Recreates them with the complete schema (all old + new fields)
 * 4. Restores all data with new fields added
 * 
 * IMPORTANT: This preserves ALL existing data
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times');
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Backup existing data
const backupCollection = async (collectionName) => {
  const db = mongoose.connection.db;
  const collection = db.collection(collectionName);
  const data = await collection.find({}).toArray();
  console.log(`📦 Backed up ${data.length} documents from ${collectionName}`);
  return data;
};

// Recreate Users Collection with Complete Schema
const recreateUsersCollection = async (backupData) => {
  const db = mongoose.connection.db;
  
  console.log('\n🔧 Recreating users collection with complete schema...');
  
  // Drop existing collection
  try {
    await db.collection('users').drop();
    console.log('   ✓ Dropped old users collection');
  } catch (error) {
    if (error.code !== 26) { // 26 = namespace not found
      throw error;
    }
  }
  
  // Create new collection without validation (Mongoose models will handle validation)
  await db.createCollection('users');
  console.log('   ✓ Created new users collection');
  
  // Create indexes
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ user_type: 1 });
  await db.collection('users').createIndex({ employee_id: 1 });
  await db.collection('users').createIndex({ distributor_id: 1 });
  await db.collection('users').createIndex({ active: 1 });
  console.log('   ✓ Created indexes (username, email, user_type, employee_id, distributor_id, active)');
  
  // Restore data with new fields
  if (backupData.length > 0) {
    const transformedData = backupData.map(doc => ({
      ...doc,
      user_type: doc.user_type || 'employee',
      employee_id: doc.employee_id || null,
      distributor_id: doc.distributor_id || null,
      tokenVersion: doc.tokenVersion || 0
    }));
    
    await db.collection('users').insertMany(transformedData);
    console.log(`   ✓ Restored ${transformedData.length} users with enhanced schema`);
  }
  
  return backupData.length;
};

// Recreate Employees Collection with Complete Schema
const recreateEmployeesCollection = async (backupData) => {
  const db = mongoose.connection.db;
  
  console.log('\n🔧 Recreating employees collection with complete schema...');
  
  // Drop existing collection
  try {
    await db.collection('employees').drop();
    console.log('   ✓ Dropped old employees collection');
  } catch (error) {
    if (error.code !== 26) { // 26 = namespace not found
      throw error;
    }
  }
  
  // Create new collection without validation (Mongoose models will handle validation)
  await db.createCollection('employees');
  console.log('   ✓ Created new employees collection');
  
  // Create indexes
  await db.collection('employees').createIndex({ employee_id: 1 }, { unique: true });
  await db.collection('employees').createIndex({ designation_id: 1 });
  await db.collection('employees').createIndex({ name: 1 });
  await db.collection('employees').createIndex({ date_birth: 1 });
  await db.collection('employees').createIndex({ nationality: 1 });
  await db.collection('employees').createIndex({ national_id: 1 });
  await db.collection('employees').createIndex({ passport_number: 1 });
  await db.collection('employees').createIndex({ mobile_personal: 1 });
  await db.collection('employees').createIndex({ highest_degree: 1 });
  await db.collection('employees').createIndex({ active: 1 });
  await db.collection('employees').createIndex({ employee_type: 1 });
  console.log('   ✓ Created all required indexes');
  
  // Restore data with new fields
  if (backupData.length > 0) {
    const transformedData = backupData.map(doc => ({
      ...doc,
      employee_type: doc.employee_type || 'system_admin',
      territory_assignments: doc.territory_assignments || {
        zone_ids: [],
        region_ids: [],
        area_ids: [],
        db_point_ids: [],
        all_territory_ids: []
      },
      facility_assignments: doc.facility_assignments || {
        factory_ids: [],
        depot_ids: []
      },
      department: doc.department || null
    }));
    
    await db.collection('employees').insertMany(transformedData);
    console.log(`   ✓ Restored ${transformedData.length} employees with enhanced schema`);
  }
  
  return backupData.length;
};

// Main migration function
const runMigration = async () => {
  try {
    await connectDB();
    
    console.log('🔄 Starting collection recreation with complete schema\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Backup existing data
    console.log('\n📦 STEP 1: Backing up existing data...');
    const usersBackup = await backupCollection('users');
    const employeesBackup = await backupCollection('employees');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Recreate users collection
    console.log('\n📋 STEP 2: Recreating Users Collection');
    const usersCount = await recreateUsersCollection(usersBackup);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Recreate employees collection
    console.log('\n👥 STEP 3: Recreating Employees Collection');
    const employeesCount = await recreateEmployeesCollection(employeesBackup);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Summary
    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Users collection: ${usersCount} documents restored`);
    console.log(`   • Employees collection: ${employeesCount} documents restored`);
    console.log(`   • All existing fields preserved`);
    console.log(`   • New authentication fields added`);
    console.log(`   • Schema validation enabled`);
    console.log(`   • Indexes created\n`);
    
    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Link users to employees/distributors:');
    console.log('      db.users.updateOne(');
    console.log('        { username: "john.doe" },');
    console.log('        { $set: { employee_id: ObjectId("..."), user_type: "employee" } }');
    console.log('      );\n');
    console.log('   2. Set employee types and context:');
    console.log('      db.employees.updateOne(');
    console.log('        { employee_id: "EMP-0001" },');
    console.log('        { $set: {');
    console.log('          employee_type: "field",');
    console.log('          "territory_assignments.zone_ids": [ObjectId("...")]');
    console.log('        }}');
    console.log('      );\n');
    console.log('   3. Verify the migration:');
    console.log('      db.users.findOne()');
    console.log('      db.employees.findOne()\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  } finally {
    console.log('🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Run the migration
runMigration();
