const mongoose = require('mongoose');
const { User, Role } = require('./src/models');

(async () => {
  await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
  
  // Check the SuperAdmin user
  const user = await User.findOne({ 
    $or: [
      { email: 'superadmin@bdcompute.com' },
      { username: 'SuperAdmin' }
    ]
  }).populate('role_id');
  
  console.log('SuperAdmin user:', {
    email: user ? user.email : 'not found',
    username: user ? user.username : 'not found',
    role_id: user ? user.role_id : 'not found'
  });
  
  process.exit(0);
})();