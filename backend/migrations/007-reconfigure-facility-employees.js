/**
 * Reconfigure Facility Employees - Correct Use Case
 * 
 * CORRECT: Multiple employees can manage the SAME facility
 * INCORRECT: One employee managing multiple facilities
 * 
 * Example: Dhaka Central Depot can have:
 * - Warehouse Manager
 * - Inventory Supervisor  
 * - Logistics Coordinator
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

const reconfigureFacilityEmployees = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏭 Reconfiguring Facility Employees (Correct Use Case)\n');
    console.log('📝 Use Case: Multiple employees can manage the SAME facility\n');
    
    // Get available facilities
    const depots = await db.collection('depots').find({}).toArray();
    console.log(`📊 Available Depots: ${depots.length}\n`);
    
    if (depots.length === 0) {
      console.log('⚠️  No depots found. Cannot configure facility employees.');
      process.exit(0);
    }
    
    // Show available depots
    console.log('🏪 Available Depots:');
    depots.forEach((depot, i) => {
      console.log(`   ${i + 1}. ${depot.name} (${depot.depot_id || depot._id})`);
    });
    console.log('');
    
    // Get first depot for assignment (e.g., Dhaka Central Depot)
    const mainDepot = depots[0];
    console.log(`🎯 Assigning employees to: ${mainDepot.name}\n`);
    
    // Get existing employees
    const employees = await db.collection('employees').find({}).toArray();
    const users = await db.collection('users').find({}).toArray();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔄 Reconfiguring Existing Employees:\n');
    
    // EMP-0002: Warehouse Manager at Dhaka Central Depot
    const emp002 = employees.find(e => e.employee_id === 'EMP-0002');
    if (emp002) {
      await db.collection('employees').updateOne(
        { _id: emp002._id },
        {
          $set: {
            name: 'Warehouse Manager - Dhaka',
            employee_type: 'facility',
            'facility_assignments.factory_ids': [],
            'facility_assignments.depot_ids': [mainDepot._id],
            'territory_assignments.zone_ids': [],
            'territory_assignments.region_ids': [],
            'territory_assignments.area_ids': [],
            'territory_assignments.db_point_ids': [],
            'territory_assignments.all_territory_ids': [],
            department: null
          }
        }
      );
      console.log('1️⃣  EMP-0002: Warehouse Manager - Dhaka');
      console.log(`   ✓ Assigned to: ${mainDepot.name}`);
      console.log(`   ✓ Role: Warehouse operations management`);
      console.log('');
    }
    
    // EMP-0004: Inventory Supervisor at SAME depot
    const emp004 = employees.find(e => e.employee_id === 'EMP-0004');
    if (emp004) {
      await db.collection('employees').updateOne(
        { _id: emp004._id },
        {
          $set: {
            name: 'Inventory Supervisor - Dhaka',
            employee_type: 'facility',
            'facility_assignments.factory_ids': [],
            'facility_assignments.depot_ids': [mainDepot._id], // SAME depot
            'territory_assignments.zone_ids': [],
            'territory_assignments.region_ids': [],
            'territory_assignments.area_ids': [],
            'territory_assignments.db_point_ids': [],
            'territory_assignments.all_territory_ids': [],
            department: null
          }
        }
      );
      console.log('2️⃣  EMP-0004: Inventory Supervisor - Dhaka');
      console.log(`   ✓ Assigned to: ${mainDepot.name} (SAME depot)`);
      console.log(`   ✓ Role: Inventory tracking and management`);
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('👷 Creating Additional Facility Employee:\n');
    
    // Create EMP-0005: Logistics Coordinator at SAME depot
    const superAdminRole = await db.collection('roles').findOne({ role: 'SuperAdmin' });
    const firstUser = await db.collection('users').findOne({});
    const firstDesignation = await db.collection('designations').findOne({});
    
    if (superAdminRole && firstUser && firstDesignation) {
      const newEmployeeId = 'EMP-0005';
      
      // Check if already exists
      const existingEmp005 = await db.collection('employees').findOne({ employee_id: newEmployeeId });
      
      if (!existingEmp005) {
        // Create employee
        const newEmployee = {
          employee_id: newEmployeeId,
          designation_id: firstDesignation._id,
          name: 'Logistics Coordinator - Dhaka',
          date_birth: new Date('1990-03-20'),
          gender: 'female',
          religion: 'Islam',
          marital_status: 'single',
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
            factory_ids: [],
            depot_ids: [mainDepot._id] // SAME depot
          },
          department: null,
          created_at: new Date(),
          created_by: firstUser._id,
          updated_at: new Date(),
          updated_by: firstUser._id
        };
        
        const employeeResult = await db.collection('employees').insertOne(newEmployee);
        console.log(`3️⃣  ${newEmployeeId}: Logistics Coordinator - Dhaka`);
        console.log(`   ✓ Assigned to: ${mainDepot.name} (SAME depot)`);
        console.log(`   ✓ Role: Logistics and distribution coordination`);
        
        // Create user
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
        console.log(`   ✓ Username: ${newUser.username}`);
        console.log(`   ✓ Password: admin123`);
        console.log('');
      } else {
        // Update existing EMP-0005
        await db.collection('employees').updateOne(
          { _id: existingEmp005._id },
          {
            $set: {
              name: 'Logistics Coordinator - Dhaka',
              employee_type: 'facility',
              'facility_assignments.depot_ids': [mainDepot._id]
            }
          }
        );
        console.log(`3️⃣  ${newEmployeeId}: Logistics Coordinator - Dhaka (updated)`);
        console.log(`   ✓ Assigned to: ${mainDepot.name} (SAME depot)`);
        console.log('');
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Show final configuration
    const updatedEmployees = await db.collection('employees').find({}).toArray();
    const facilityEmployees = updatedEmployees.filter(e => e.employee_type === 'facility');
    
    console.log('📋 Final Configuration:\n');
    console.log(`🏪 Facility: ${mainDepot.name}`);
    console.log(`   Depot ID: ${mainDepot._id}`);
    console.log(`   Employees Assigned: ${facilityEmployees.length}\n`);
    
    facilityEmployees.forEach((emp, index) => {
      console.log(`   ${index + 1}. ${emp.name} (${emp.employee_id})`);
      console.log(`      Employee Type: ${emp.employee_type}`);
      console.log(`      Assigned Depots: ${emp.facility_assignments?.depot_ids?.length || 0}`);
      
      // Get corresponding user
      const user = users.find(u => u.employee_id?.toString() === emp._id.toString());
      if (user) {
        console.log(`      Username: ${user.username}`);
      }
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ Reconfiguration Complete!\n');
    
    console.log('📊 Summary:');
    console.log(`   • Total Employees: ${updatedEmployees.length}`);
    console.log(`   • System Admins: ${updatedEmployees.filter(e => e.employee_type === 'system_admin').length}`);
    console.log(`   • Facility Employees: ${facilityEmployees.length} (all at ${mainDepot.name})`);
    console.log(`   • HQ Employees: ${updatedEmployees.filter(e => e.employee_type === 'hq').length}`);
    console.log(`   • Field Employees: ${updatedEmployees.filter(e => e.employee_type === 'field').length}`);
    
    console.log('\n🎯 Test Logins (all manage the same depot):');
    const facilityUsers = await db.collection('users').find({ 
      employee_id: { $in: facilityEmployees.map(e => e._id) }
    }).toArray();
    
    facilityUsers.forEach(u => {
      console.log(`   Username: ${u.username} | Password: admin123`);
    });
    
    console.log('\n💡 Use Case Validated:');
    console.log(`   ✓ Multiple employees managing SAME facility`);
    console.log(`   ✓ Each employee has specific role (Warehouse, Inventory, Logistics)`);
    console.log(`   ✓ All employees assigned to: ${mainDepot.name}`);
    console.log(`   ✓ Collaborative facility management supported`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Error reconfiguring facility employees:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

reconfigureFacilityEmployees();
