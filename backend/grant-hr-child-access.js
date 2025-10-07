const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const grantHRChildMenuAccess = async () => {
  try {
    await connectDB();

    console.log('🔍 Finding SuperAdmin role and HR child menu items...');

    // Get direct access to the collections
    const db = mongoose.connection.db;
    const rolesCollection = db.collection('roles');
    const sidebarMenuCollection = db.collection('sidebar_menu_items');
    const roleSidebarMenuCollection = db.collection('role_sidebar_menu_items');

    // Find SuperAdmin role
    const superAdminRole = await rolesCollection.findOne({ role: 'SuperAdmin' });
    if (!superAdminRole) {
      console.error('❌ SuperAdmin role not found');
      return;
    }
    console.log('✅ SuperAdmin role found:', superAdminRole._id);

    // Find HR child menu items
    const hrParentMenu = await sidebarMenuCollection.findOne({ 
      label: 'HR',
      parent_id: null 
    });

    if (!hrParentMenu) {
      console.error('❌ HR parent menu not found');
      return;
    }

    const hrChildMenuItems = await sidebarMenuCollection.find({
      parent_id: hrParentMenu._id
    }).toArray();

    console.log(`✅ Found ${hrChildMenuItems.length} HR child menu items`);

    // Grant access to each child menu item
    for (const menuItem of hrChildMenuItems) {
      console.log(`📝 Processing ${menuItem.label} menu item...`);

      // Check if permission already exists
      const existingPermission = await roleSidebarMenuCollection.findOne({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: menuItem._id
      });

      if (existingPermission) {
        console.log(`⚠️ SuperAdmin already has access to ${menuItem.label}`);
        continue;
      }

      // Create menu permission
      const result = await roleSidebarMenuCollection.insertOne({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: menuItem._id
      });

      console.log(`✅ SuperAdmin access granted to ${menuItem.label} (Permission ID: ${result.insertedId})`);
    }

    console.log('\n🎉 HR Child Menu Access Setup Complete!');
    console.log('📋 SuperAdmin now has access to:');
    console.log('   ├── HR (Parent Menu)');
    console.log('   ├── Designations (/hr/designations)');
    console.log('   └── Employees (/hr/employees)');

  } catch (error) {
    console.error('❌ Error granting HR child menu access:', error);
  } finally {
    mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
};

grantHRChildMenuAccess();