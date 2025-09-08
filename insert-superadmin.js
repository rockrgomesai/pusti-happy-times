// Hash password and insert user
const bcrypt = require('bcrypt');

// Get the SuperAdmin role ObjectId
const superAdminRole = db.roles.findOne({role: 'SuperAdmin'});

// Hash the password
const saltRounds = 12;
const hashedPassword = '$2b$12$LQv3c1yqBgOTQEv5FLoRvOJm1yg7xEz8h8vLFQ8r1pMzL1nYz2yYu'; // bcrypt hash of 'admin123'

// Insert the user
db.users.insertOne({
  username: 'SuperAdmin',
  password: hashedPassword,
  role_id: ObjectId('68be2193ea73210503fa3350'),
  email: 'superadmin@bdcompute.com',
  active: true,
  created_at: new Date(),
  updated_at: new Date()
});

print('SuperAdmin user inserted successfully');
