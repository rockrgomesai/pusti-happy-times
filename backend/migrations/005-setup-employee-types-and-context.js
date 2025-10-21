/**
 * Setup Employee Types and Context
 * 
 * Configures each employee with appropriate type and context:
 * - EMP-0001: system_admin (full access)
 * - EMP-0002: field employee with territory assignments
 * - EMP-0003: hq employee with department
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

const setupEmployeeTypes = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 Setting up Employee Types and Context\n');
    
    // Get all employees
    const employees = await db.collection('employees').find({}).toArray();
    console.log(`Found ${employees.length} employees\n`);
    
    // Check if we have territories/factories/depots in the database
    const territoriesCount = await db.collection('territories').countDocuments();
    const factoriesCount = await db.collection('factories').countDocuments();
    const depotsCount = await db.collection('depots').countDocuments();
    
    console.log('📊 Available Resources:');
    console.log(`   - Territories: ${territoriesCount}`);
    console.log(`   - Factories: ${factoriesCount}`);
    console.log(`   - Depots: ${depotsCount}\n`);
    
    // Setup each employee
    
    // 1. Keep first employee as system_admin (already set)
    console.log('1️⃣  Employee: ' + employees[0].name + ' (' + employees[0].employee_id + ')');
    console.log('   ✓ Already configured as system_admin (full access)');
    console.log('   ✓ No context restrictions\n');
    
    // 2. Set second employee as field employee
    if (employees.length > 1) {
      console.log('2️⃣  Employee: ' + employees[1].name + ' (' + employees[1].employee_id + ')');
      
      if (territoriesCount > 0) {
        // Get some territories to assign
        const territories = await db.collection('territories').find({}).limit(5).toArray();
        const territoryIds = territories.map(t => t._id);
        
        await db.collection('employees').updateOne(
          { _id: employees[1]._id },
          { 
            $set: {
              employee_type: 'field',
              'territory_assignments.all_territory_ids': territoryIds,
              'territory_assignments.zone_ids': territoryIds.slice(0, 2),
              'territory_assignments.region_ids': territoryIds.slice(2, 4),
              'territory_assignments.area_ids': [territoryIds[4] || territoryIds[0]]
            }
          }
        );
        
        console.log('   ✓ Set as field employee');
        console.log(`   ✓ Assigned ${territoryIds.length} territories`);
        console.log('   ✓ Context: territory-based access\n');
      } else {
        console.log('   ⚠️  No territories found - keeping as system_admin');
        console.log('   ℹ️  Create territories first to assign field context\n');
      }
    }
    
    // 3. Set third employee as HQ employee
    if (employees.length > 2) {
      console.log('3️⃣  Employee: ' + employees[2].name + ' (' + employees[2].employee_id + ')');
      
      await db.collection('employees').updateOne(
        { _id: employees[2]._id },
        { 
          $set: {
            employee_type: 'hq',
            department: 'sales',
            'territory_assignments.zone_ids': [],
            'territory_assignments.region_ids': [],
            'territory_assignments.area_ids': [],
            'territory_assignments.db_point_ids': [],
            'territory_assignments.all_territory_ids': [],
            'facility_assignments.factory_ids': [],
            'facility_assignments.depot_ids': []
          }
        }
      );
      
      console.log('   ✓ Set as HQ employee');
      console.log('   ✓ Department: sales');
      console.log('   ✓ Context: department-based access\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Verify the changes
    console.log('\n📋 Updated Employee Configuration:\n');
    const updatedEmployees = await db.collection('employees').find({}).toArray();
    
    updatedEmployees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.name} (${emp.employee_id})`);
      console.log(`   Type: ${emp.employee_type}`);
      
      if (emp.employee_type === 'field') {
        console.log(`   Territories: ${emp.territory_assignments.all_territory_ids.length} assigned`);
      } else if (emp.employee_type === 'facility') {
        const facCount = emp.facility_assignments.factory_ids.length;
        const depCount = emp.facility_assignments.depot_ids.length;
        console.log(`   Facilities: ${facCount} factories, ${depCount} depots`);
      } else if (emp.employee_type === 'hq') {
        console.log(`   Department: ${emp.department}`);
      } else {
        console.log(`   Access: Full system access`);
      }
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Employee types and context configured successfully!\n');
    
    console.log('📝 Summary:');
    console.log('   • System Admin: ' + updatedEmployees.filter(e => e.employee_type === 'system_admin').length);
    console.log('   • Field Employees: ' + updatedEmployees.filter(e => e.employee_type === 'field').length);
    console.log('   • Facility Employees: ' + updatedEmployees.filter(e => e.employee_type === 'facility').length);
    console.log('   • HQ Employees: ' + updatedEmployees.filter(e => e.employee_type === 'hq').length);
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Test login for each employee type');
    console.log('   2. Verify JWT tokens include correct context');
    console.log('   3. Test authorization middleware\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Error setting up employee types:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

setupEmployeeTypes();
