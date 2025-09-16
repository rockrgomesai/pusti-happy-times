const mongoose = require('mongoose');
const { User, Role } = require('./src/models');

(async () => {
  await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
  
  // Check existing users
  const users = await User.find({});
  console.log('Existing users:', users.map(u => ({ email: u.email, role_id: u.role_id })));
  
  // Check SuperAdmin role
  const superAdminRole = await Role.findOne({ role: 'SuperAdmin' });
  console.log('SuperAdmin role:', superAdminRole);
  
  // Create SuperAdmin user if needed
  if (!users.find(u => u.email === 'superadmin@example.com')) {
    const newUser = new User({
      username: 'superadmin',
      email: 'superadmin@example.com',
      password: 'password123',
      firstName: 'Super',
      lastName: 'Admin',
      role_id: superAdminRole._id,
      status: 'active'
    });
    await newUser.save();
    console.log('Created SuperAdmin user');
  }
  
  process.exit(0);
})();