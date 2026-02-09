const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin';

async function getSOLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Find Sales Officer designation
    const designation = await db.collection('designations').findOne({ name: 'Sales Officer' });
    if (!designation) {
      console.log('Sales Officer designation not found!');
      return;
    }
    
    console.log(`Found designation: ${designation.name} (${designation._id})\n`);
    
    // Find employees with this designation
    const employees = await db.collection('employees').find({ 
      designation_id: designation._id,
      active: true 
    }).limit(5).toArray();
    
    console.log(`Found ${employees.length} active Sales Officers:\n`);
    
    for (const emp of employees) {
      // Find user account for this employee
      const user = await db.collection('users').findOne({ employee_id: emp._id });
      
      if (user) {
        console.log('─'.repeat(60));
        console.log(`Name: ${emp.name}`);
        console.log(`Employee ID: ${emp.employee_id}`);
        console.log(`Username: ${user.username}`);
        console.log(`User has password: ${user.password ? 'Yes' : 'No'}`);
        console.log(`Active: ${user.active}`);
        console.log(`Routes assigned: ${emp.routes ? emp.routes.length : 0}`);
        console.log('');
      }
    }
    
    console.log('\n💡 TIP: If no users found, you need to create user accounts for SOs.');
    console.log('   Or use the mobile app with a test account that has employee_id.\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

getSOLogin();
