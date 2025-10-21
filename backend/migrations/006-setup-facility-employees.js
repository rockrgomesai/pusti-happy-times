/**
 * Setup Facility Employees
 * 
 * Checks available factories/depots and creates facility employee examples
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

const setupFacilityEmployees = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏭 Setting up Facility Employees\n');
    
    // Check available facilities
    const factoriesCount = await db.collection('factories').countDocuments();
    const depotsCount = await db.collection('depots').countDocuments();
    
    console.log('📊 Available Facilities:');
    console.log(`   - Factories: ${factoriesCount}`);
    console.log(`   - Depots: ${depotsCount}\n`);
    
    if (factoriesCount === 0 && depotsCount === 0) {
      console.log('⚠️  No factories or depots found in database');
      console.log('   Cannot create facility employees without facilities');
      console.log('\n💡 Recommendation:');
      console.log('   1. Seed factories and depots first');
      console.log('   2. Re-run this script to create facility employees\n');
      process.exit(0);
    }
    
    // Get sample facilities
    const factories = factoriesCount > 0 ? await db.collection('factories').find({}).limit(2).toArray() : [];
    const depots = depotsCount > 0 ? await db.collection('depots').find({}).limit(3).toArray() : [];
    
    if (factories.length > 0) {
      console.log('🏭 Sample Factories:');
      factories.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.name} (${f.factory_id || f._id})`);
      });
      console.log('');
    }
    
    if (depots.length > 0) {
      console.log('🏪 Sample Depots:');
      depots.forEach((d, i) => {
        console.log(`   ${i + 1}. ${d.name} (${d.depot_id || d._id})`);
      });
      console.log('');
    }
    
    // Check existing employees
    const employees = await db.collection('employees').find({}).toArray();
    console.log(`📋 Current Employees: ${employees.length}`);
    
    const facilityEmployees = employees.filter(e => e.employee_type === 'facility');
    console.log(`   - Facility employees: ${facilityEmployees.length}\n`);
    
    // Option 1: Convert existing employee to facility type
    if (employees.length >= 2 && depotsCount > 0) {
      const employeeToConvert = employees[1]; // EMP-0002
      
      console.log('🔄 Converting existing employee to facility type...');
      console.log(`   Employee: ${employeeToConvert.name} (${employeeToConvert.employee_id})`);
      
      const depotIds = depots.map(d => d._id);
      
      await db.collection('employees').updateOne(
        { _id: employeeToConvert._id },
        {
          $set: {
            employee_type: 'facility',
            'facility_assignments.depot_ids': depotIds.slice(0, 2),
            'facility_assignments.factory_ids': factories.length > 0 ? [factories[0]._id] : [],
            'territory_assignments.zone_ids': [],
            'territory_assignments.region_ids': [],
            'territory_assignments.area_ids': [],
            'territory_assignments.db_point_ids': [],
            'territory_assignments.all_territory_ids': [],
            department: null
          }
        }
      );
      
      console.log('   ✓ Converted to facility employee');
      console.log(`   ✓ Assigned ${depotIds.slice(0, 2).length} depots`);
      if (factories.length > 0) {
        console.log(`   ✓ Assigned 1 factory`);
      }
      console.log('');
    }
    
    // Option 2: Create a new facility employee
    const createNewEmployee = employees.length < 5 && (depotsCount > 0 || factoriesCount > 0);
    
    if (createNewEmployee) {
      console.log('👷 Creating new facility employee...\n');
      
      // Get SuperAdmin role and first user for audit
      const superAdminRole = await db.collection('roles').findOne({ role: 'SuperAdmin' });
      const firstUser = await db.collection('users').findOne({});
      const firstDesignation = await db.collection('designations').findOne({});
      
      if (!superAdminRole || !firstUser || !firstDesignation) {
        console.log('⚠️  Missing required data (role/user/designation)');
      } else {
        const newEmployeeId = `EMP-${String(employees.length + 1).padStart(4, '0')}`;
        
        // Create employee
        const newEmployee = {
          employee_id: newEmployeeId,
          designation_id: firstDesignation._id,
          name: 'Warehouse Manager',
          date_birth: new Date('1988-01-15'),
          gender: 'male',
          religion: 'Islam',
          marital_status: 'married',
          nationality: 'Bangladeshi',
          active: true,
          employee_type: 'facility',
          territory_assignments: {
            zone_ids: [],
            region_ids: [],
            area_ids: [],
            db_point_ids: [],
            all_territory_ids: []
          },
          facility_assignments: {
            factory_ids: factories.length > 0 ? [factories[0]._id] : [],
            depot_ids: depots.length > 0 ? depots.map(d => d._id) : []
          },
          department: null,
          created_at: new Date(),
          created_by: firstUser._id,
          updated_at: new Date(),
          updated_by: firstUser._id
        };
        
        const employeeResult = await db.collection('employees').insertOne(newEmployee);
        console.log(`   ✓ Created employee: ${newEmployee.name} (${newEmployeeId})`);
        
        // Create user for this employee
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const newUser = {
          username: newEmployeeId.toLowerCase(),
          password: hashedPassword,
          role_id: superAdminRole._id,
          email: `${newEmployeeId.toLowerCase()}@pustihappytimes.com`,
          active: true,
          user_type: 'employee',
          employee_id: employeeResult.insertedId,
          distributor_id: null,
          tokenVersion: 0,
          created_at: new Date(),
          created_by: firstUser._id,
          updated_at: new Date(),
          updated_by: firstUser._id
        };
        
        await db.collection('users').insertOne(newUser);
        console.log(`   ✓ Created user: ${newUser.username}`);
        console.log(`   ✓ Password: admin123`);
        console.log(`   ✓ Assigned ${newEmployee.facility_assignments.depot_ids.length} depots`);
        if (newEmployee.facility_assignments.factory_ids.length > 0) {
          console.log(`   ✓ Assigned ${newEmployee.facility_assignments.factory_ids.length} factories`);
        }
        console.log('');
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show summary
    const updatedEmployees = await db.collection('employees').find({}).toArray();
    const facilityCount = updatedEmployees.filter(e => e.employee_type === 'facility').length;
    
    console.log('\n📋 Updated Employee Summary:\n');
    updatedEmployees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.name} (${emp.employee_id})`);
      console.log(`   Type: ${emp.employee_type}`);
      
      if (emp.employee_type === 'facility') {
        const facCount = emp.facility_assignments?.factory_ids?.length || 0;
        const depCount = emp.facility_assignments?.depot_ids?.length || 0;
        console.log(`   Facilities: ${facCount} factories, ${depCount} depots`);
      } else if (emp.employee_type === 'field') {
        console.log(`   Territories: ${emp.territory_assignments?.all_territory_ids?.length || 0} assigned`);
      } else if (emp.employee_type === 'hq') {
        console.log(`   Department: ${emp.department}`);
      } else {
        console.log(`   Access: Full system access`);
      }
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Facility employee setup complete!\n');
    
    console.log('📊 Final Statistics:');
    console.log(`   • Total Employees: ${updatedEmployees.length}`);
    console.log(`   • System Admins: ${updatedEmployees.filter(e => e.employee_type === 'system_admin').length}`);
    console.log(`   • Field Employees: ${updatedEmployees.filter(e => e.employee_type === 'field').length}`);
    console.log(`   • Facility Employees: ${facilityCount}`);
    console.log(`   • HQ Employees: ${updatedEmployees.filter(e => e.employee_type === 'hq').length}`);
    
    console.log('\n🎯 Test Login:');
    const facilityUsers = await db.collection('users').find({ 
      employee_id: { $in: updatedEmployees.filter(e => e.employee_type === 'facility').map(e => e._id) }
    }).toArray();
    
    facilityUsers.forEach(u => {
      console.log(`   Username: ${u.username}`);
      console.log(`   Password: admin123`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Error setting up facility employees:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

setupFacilityEmployees();
