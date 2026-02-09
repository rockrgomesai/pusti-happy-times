const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin';

async function checkRoutes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Route = mongoose.model('Route', new mongoose.Schema({}, { strict: false, collection: 'routes' }));
    
    const routes = await Route.find({ active: true }).limit(30);
    console.log(`Found ${routes.length} active routes:\n`);
    
    routes.forEach((r, i) => {
      console.log(`${i + 1}. ${r.route_name} (ID: ${r._id})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkRoutes();
