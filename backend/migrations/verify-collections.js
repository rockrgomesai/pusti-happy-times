/**
 * Verify Collections Structure
 * Check that users and employees have all required fields
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times');
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const verifyCollections = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 USERS COLLECTION\n');
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`Total Users: ${users.length}\n`);
    
    if (users.length > 0) {
      const sampleUser = users[0];
      console.log('Sample User Document Structure:');
      console.log('  Core Fields:');
      console.log(`    ✓ _id: ${sampleUser._id ? 'present' : 'missing'}`);
      console.log(`    ✓ username: ${sampleUser.username ? 'present' : 'missing'}`);
      console.log(`    ✓ password: ${sampleUser.password ? 'present (hashed)' : 'missing'}`);
      console.log(`    ✓ role_id: ${sampleUser.role_id ? 'present' : 'missing'}`);
      console.log(`    ✓ email: ${sampleUser.email ? 'present' : 'missing'}`);
      console.log(`    ✓ active: ${sampleUser.active !== undefined ? 'present' : 'missing'}`);
      
      console.log('\n  Authentication Fields (NEW):');
      console.log(`    ✓ user_type: ${sampleUser.user_type ? sampleUser.user_type : 'missing'}`);
      console.log(`    ✓ employee_id: ${sampleUser.employee_id ? 'present' : 'null'}`);
      console.log(`    ✓ distributor_id: ${sampleUser.distributor_id !== undefined ? 'null' : 'missing'}`);
      console.log(`    ✓ tokenVersion: ${sampleUser.tokenVersion !== undefined ? sampleUser.tokenVersion : 'missing'}`);
      
      console.log('\n  Audit Fields:');
      console.log(`    ✓ created_at: ${sampleUser.created_at ? 'present' : 'missing'}`);
      console.log(`    ✓ created_by: ${sampleUser.created_by ? 'present' : 'missing'}`);
      console.log(`    ✓ updated_at: ${sampleUser.updated_at ? 'present' : 'missing'}`);
      console.log(`    ✓ updated_by: ${sampleUser.updated_by ? 'present' : 'missing'}`);
      
      console.log('\n  All Users:');
      users.forEach((user, index) => {
        console.log(`    ${index + 1}. ${user.username} - ${user.user_type} - ${user.employee_id ? 'linked to employee' : 'not linked'}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('👥 EMPLOYEES COLLECTION\n');
    
    const employees = await db.collection('employees').find({}).toArray();
    console.log(`Total Employees: ${employees.length}\n`);
    
    if (employees.length > 0) {
      const sampleEmployee = employees[0];
      console.log('Sample Employee Document Structure:');
      console.log('  Core Fields:');
      console.log(`    ✓ _id: ${sampleEmployee._id ? 'present' : 'missing'}`);
      console.log(`    ✓ employee_id: ${sampleEmployee.employee_id ? 'present' : 'missing'}`);
      console.log(`    ✓ name: ${sampleEmployee.name ? 'present' : 'missing'}`);
      console.log(`    ✓ designation_id: ${sampleEmployee.designation_id ? 'present' : 'missing'}`);
      console.log(`    ✓ email: ${sampleEmployee.email || 'null'}`);
      console.log(`    ✓ mobile_personal: ${sampleEmployee.mobile_personal || 'null'}`);
      console.log(`    ✓ active: ${sampleEmployee.active !== undefined ? 'present' : 'missing'}`);
      
      console.log('\n  Authentication Context Fields (NEW):');
      console.log(`    ✓ employee_type: ${sampleEmployee.employee_type ? sampleEmployee.employee_type : 'missing'}`);
      console.log(`    ✓ territory_assignments: ${sampleEmployee.territory_assignments ? 'present' : 'missing'}`);
      if (sampleEmployee.territory_assignments) {
        console.log(`       - zone_ids: ${sampleEmployee.territory_assignments.zone_ids?.length || 0} zones`);
        console.log(`       - region_ids: ${sampleEmployee.territory_assignments.region_ids?.length || 0} regions`);
        console.log(`       - area_ids: ${sampleEmployee.territory_assignments.area_ids?.length || 0} areas`);
        console.log(`       - db_point_ids: ${sampleEmployee.territory_assignments.db_point_ids?.length || 0} points`);
        console.log(`       - all_territory_ids: ${sampleEmployee.territory_assignments.all_territory_ids?.length || 0} total`);
      }
      console.log(`    ✓ facility_assignments: ${sampleEmployee.facility_assignments ? 'present' : 'missing'}`);
      if (sampleEmployee.facility_assignments) {
        console.log(`       - factory_ids: ${sampleEmployee.facility_assignments.factory_ids?.length || 0} factories`);
        console.log(`       - depot_ids: ${sampleEmployee.facility_assignments.depot_ids?.length || 0} depots`);
      }
      console.log(`    ✓ department: ${sampleEmployee.department || 'null'}`);
      
      console.log('\n  All Employees:');
      employees.forEach((emp, index) => {
        console.log(`    ${index + 1}. ${emp.name} (${emp.employee_id}) - ${emp.employee_type}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ VERIFICATION COMPLETE\n');
    
    // Check indexes
    console.log('📑 Indexes:');
    const userIndexes = await db.collection('users').indexes();
    console.log(`\n  Users Collection (${userIndexes.length} indexes):`);
    userIndexes.forEach((index, i) => {
      const keys = Object.keys(index.key).join(', ');
      const unique = index.unique ? ' (unique)' : '';
      console.log(`    ${i + 1}. ${keys}${unique}`);
    });
    
    const employeeIndexes = await db.collection('employees').indexes();
    console.log(`\n  Employees Collection (${employeeIndexes.length} indexes):`);
    employeeIndexes.forEach((index, i) => {
      const keys = Object.keys(index.key).join(', ');
      const unique = index.unique ? ' (unique)' : '';
      console.log(`    ${i + 1}. ${keys}${unique}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Error verifying collections:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

verifyCollections();
