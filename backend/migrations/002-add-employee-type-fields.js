/**
 * Migration Script: Add Employee Type Fields
 * 
 * Adds the following fields to the employees collection:
 * - employee_type (default: 'system_admin')
 * - territory_assignments (default: empty structure)
 * - facility_assignments (default: empty structure)
 * - department (default: null)
 * 
 * Usage:
 *   node backend/migrations/002-add-employee-type-fields.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrate() {
  try {
    console.log('\n🔄 Starting migration: Add employee_type fields to employees collection\n');
    
    const db = mongoose.connection.db;
    const employeesCollection = db.collection('employees');
    
    // Check current state
    const totalEmployees = await employeesCollection.countDocuments();
    console.log(`📊 Found ${totalEmployees} employees in collection`);
    
    // Add new fields to all employees
    const result = await employeesCollection.updateMany(
      {},
      {
        $set: {
          employee_type: 'system_admin',  // Default, requires manual update
          territory_assignments: {
            zone_ids: [],
            region_ids: [],
            area_ids: [],
            db_point_ids: [],
            all_territory_ids: []
          },
          facility_assignments: {
            factory_ids: [],
            depot_ids: []
          },
          department: null
        }
      }
    );
    
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`   - Updated: ${result.modifiedCount} employees`);
    console.log(`   - Matched: ${result.matchedCount} employees`);
    
    console.log('\n⚠️  MANUAL ACTION REQUIRED:');
    console.log('   1. Set correct employee_type for each employee:');
    console.log('      - system_admin: Full system access, no restrictions');
    console.log('      - field: Territory-based (zones, regions, areas, db_points)');
    console.log('      - facility: Facility-based (factories, depots)');
    console.log('      - hq: Department-based (sales, marketing, finance, etc.)');
    console.log('');
    console.log('   2. Assign territories for field employees');
    console.log('   3. Assign facilities for facility employees');
    console.log('   4. Assign department for hq employees');
    
    console.log('\n📝 Example MongoDB commands:');
    console.log('   // Set field employee with territory assignments');
    console.log('   db.employees.updateOne(');
    console.log('     { employee_id: "EMP-0001" },');
    console.log('     { $set: {');
    console.log('       employee_type: "field",');
    console.log('       "territory_assignments.zone_ids": [ObjectId("...")],');
    console.log('       "territory_assignments.all_territory_ids": [ObjectId("...")]');
    console.log('     }}');
    console.log('   );');
    console.log('');
    console.log('   // Set facility employee');
    console.log('   db.employees.updateOne(');
    console.log('     { employee_id: "EMP-0002" },');
    console.log('     { $set: {');
    console.log('       employee_type: "facility",');
    console.log('       "facility_assignments.factory_ids": [ObjectId("...")]');
    console.log('     }}');
    console.log('   );');
    console.log('');
    console.log('   // Set HQ employee');
    console.log('   db.employees.updateOne(');
    console.log('     { employee_id: "EMP-0003" },');
    console.log('     { $set: {');
    console.log('       employee_type: "hq",');
    console.log('       department: "sales"');
    console.log('     }}');
    console.log('   );');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

async function run() {
  try {
    await connectDB();
    await migrate();
    console.log('\n✅ Migration script completed successfully\n');
  } catch (error) {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
    process.exit(0);
  }
}

run();
