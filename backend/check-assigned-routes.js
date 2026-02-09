const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin';

async function checkAssignedRoutes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    const emp = await db.collection('employees').findOne({ employee_id: '151515' });
    console.log('Employee routes:', emp.routes);
    console.log(`\nRoute IDs: ${emp.routes.map(r => r.toString()).join(', ')}\n`);
    
    const routes = await db.collection('routes').find({ 
      _id: { $in: emp.routes } 
    }).toArray();
    
    console.log(`Found ${routes.length} routes:\n`);
    routes.forEach((r, i) => {
      console.log(`${i + 1}. ${r.route_name} (ID: ${r._id})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkAssignedRoutes();
