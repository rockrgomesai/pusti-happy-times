const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const checkStructure = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times');
  
  const user = await mongoose.connection.db.collection('users').findOne();
  console.log('Sample User Document:');
  console.log(JSON.stringify(user, null, 2));
  
  await mongoose.disconnect();
  process.exit(0);
};

checkStructure();
