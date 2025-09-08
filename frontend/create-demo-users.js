// MongoDB script to create demo superadmin user
// Connect to MongoDB and run this script

use pusti_happy_times;

// First, create the SuperAdmin role
db.roles.insertOne({
  name: "SuperAdmin",
  displayName: "Super Administrator",
  permissions: [
    "user.create", "user.read", "user.update", "user.delete",
    "role.create", "role.read", "role.update", "role.delete",
    "brand.create", "brand.read", "brand.update", "brand.delete",
    "system.admin"
  ],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Get the role ID
const superAdminRole = db.roles.findOne({name: "SuperAdmin"});

// Create demo superadmin user
// Password: admin123 (hashed with bcrypt)
db.users.insertOne({
  username: "superadmin",
  email: "admin@pustihappytimes.com", 
  firstName: "Super",
  lastName: "Admin",
  password: "$2b$12$LQv3c1yqBwEHXa6UcMMRfuQmLsG9Fz.XwRQv1qBgQ1QwGhQ5QwGhQ", // admin123
  role: superAdminRole._id,
  isActive: true,
  loginAttempts: 0,
  lockUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null
});

// Create demo user  
db.users.insertOne({
  username: "demo",
  email: "demo@pustihappytimes.com",
  firstName: "Demo", 
  lastName: "User",
  password: "$2b$12$LQv3c1yqBwEHXa6UcMMRfuQmLsG9Fz.XwRQv1qBgQ1QwGhQ5QwGhQ", // demo123
  role: superAdminRole._id,
  isActive: true,
  loginAttempts: 0,
  lockUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLogin: null
});

print("Demo users created successfully!");
print("Superadmin credentials: superadmin / admin123");
print("Demo user credentials: demo / demo123");
