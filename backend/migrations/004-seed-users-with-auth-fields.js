/**
 * Seed Users Collection with Complete Schema
 * Creates default users with proper authentication fields
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

const seedUsers = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    
    // Get the SuperAdmin role
    const superAdminRole = await db.collection('roles').findOne({ role: 'SuperAdmin' });
    if (!superAdminRole) {
      console.error('❌ SuperAdmin role not found. Please create roles first.');
      process.exit(1);
    }
    
    // Get the first three employees to link to users
    const employees = await db.collection('employees').find({}).limit(3).toArray();
    
    if (employees.length === 0) {
      console.error('❌ No employees found. Please seed employees first.');
      process.exit(1);
    }
    
    console.log(`📋 Found ${employees.length} employees to link\n`);
    
    // Hash password for all users
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create system admin user (first employee)
    const systemAdminId = new mongoose.Types.ObjectId();
    
    // Prepare users data
    const users = [
      {
        _id: systemAdminId,
        username: 'superadmin',
        password: hashedPassword,
        role_id: superAdminRole._id,
        email: 'superadmin@bdcompute.com',
        active: true,
        user_type: 'employee',
        employee_id: employees[0]._id,
        distributor_id: null,
        tokenVersion: 0,
        created_at: new Date(),
        created_by: systemAdminId,
        updated_at: new Date(),
        updated_by: systemAdminId
      },
      {
        _id: new mongoose.Types.ObjectId(),
        username: employees[1].employee_id.toLowerCase(),
        password: hashedPassword,
        role_id: superAdminRole._id,
        email: `${employees[1].employee_id.toLowerCase()}@pustihappytimes.com`,
        active: true,
        user_type: 'employee',
        employee_id: employees[1]._id,
        distributor_id: null,
        tokenVersion: 0,
        created_at: new Date(),
        created_by: systemAdminId,
        updated_at: new Date(),
        updated_by: systemAdminId
      },
      {
        _id: new mongoose.Types.ObjectId(),
        username: employees[2].employee_id.toLowerCase(),
        password: hashedPassword,
        role_id: superAdminRole._id,
        email: `${employees[2].employee_id.toLowerCase()}@pustihappytimes.com`,
        active: true,
        user_type: 'employee',
        employee_id: employees[2]._id,
        distributor_id: null,
        tokenVersion: 0,
        created_at: new Date(),
        created_by: systemAdminId,
        updated_at: new Date(),
        updated_by: systemAdminId
      }
    ];
    
    // Insert users
    const result = await db.collection('users').insertMany(users);
    console.log(`✅ Inserted ${Object.keys(result.insertedIds).length} users`);
    console.log('\n📋 Created Users:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.email})`);
      console.log(`      → Linked to employee: ${employees[index].name} (${employees[index].employee_id})`);
    });
    
    console.log('\n🔑 All users password: admin123');
    console.log('\n📝 Next Steps:');
    console.log('   1. Set employee types for each employee');
    console.log('   2. Assign territories/facilities/departments as needed');
    console.log('   3. Test login with any username above');
    
  } catch (error) {
    console.error('\n❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedUsers();
