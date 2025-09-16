const mongoose = require('mongoose');
const { User, Role } = require('./src/models');

(async () => {
  await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
  
  const user = await User.findOne({ email: 'superadmin@example.com' }).populate('role_id');
  console.log('User data:', {
    email: user.email,
    role_id: user.role_id
  });
  
  const role = await Role.findOne({ role: 'SuperAdmin' });
  console.log('SuperAdmin role:', role);
  
  process.exit(0);
})();