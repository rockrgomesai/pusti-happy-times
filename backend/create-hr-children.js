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

// Import models
const { Role, SidebarMenuItem, RoleSidebarMenuItem } = require('./src/models');

const createHRChildMenuItems = async () => {
  try {
    await connectDB();

    console.log('🔍 Finding HR parent menu item...');

    // Find HR parent menu item
    const hrParentMenu = await SidebarMenuItem.findOne({ 
      label: 'HR',
      parent_id: null 
    });

    if (!hrParentMenu) {
      console.error('❌ HR parent menu item not found');
      return;
    }
    console.log('✅ HR parent menu found:', hrParentMenu._id);

    // Find SuperAdmin role for permissions
    const superAdminRole = await Role.findOne({ role: 'SuperAdmin' });
    if (!superAdminRole) {
      console.error('❌ SuperAdmin role not found');
      return;
    }
    console.log('✅ SuperAdmin role found:', superAdminRole._id);

    // Define child menu items with all required fields
    const childMenuItems = [
      {
        title: 'Designations',
        label: 'Designations',
        path: '/hr/designations',
        href: '/hr/designations',
        m_order: 1,
        icon: {
          type: 'fontawesome',
          name: 'FaUserTie'
        },
        parent_id: hrParentMenu._id,
        parentMenuItem: hrParentMenu._id,
        is_submenu: true,
        level: 1,
        sortOrder: 1,
        createdBy: superAdminRole._id,
        updatedBy: superAdminRole._id
      },
      {
        title: 'Employees',
        label: 'Employees',
        path: '/hr/employees',
        href: '/hr/employees',
        m_order: 2,
        icon: {
          type: 'fontawesome',
          name: 'FaUsers'
        },
        parent_id: hrParentMenu._id,
        parentMenuItem: hrParentMenu._id,
        is_submenu: true,
        level: 1,
        sortOrder: 2,
        createdBy: superAdminRole._id,
        updatedBy: superAdminRole._id
      }
    ];

    console.log('📝 Creating HR child menu items...');

    for (const menuData of childMenuItems) {
      // Check if menu item already exists
      const existingMenuItem = await SidebarMenuItem.findOne({
        label: menuData.label,
        parent_id: hrParentMenu._id
      });

      if (existingMenuItem) {
        console.log(`⚠️ ${menuData.label} menu item already exists`);
        continue;
      }

      // Create menu item
      const menuItem = await SidebarMenuItem.create(menuData);
      console.log(`✅ ${menuData.label} menu item created:`, menuItem._id);

      // Grant SuperAdmin access to this menu item
      const existingPermission = await RoleSidebarMenuItem.findOne({
        role_id: superAdminRole._id,
        sidebar_menu_item_id: menuItem._id
      });

      if (!existingPermission) {
        await RoleSidebarMenuItem.create({
          role_id: superAdminRole._id,
          sidebar_menu_item_id: menuItem._id
        });
        console.log(`✅ SuperAdmin access granted to ${menuData.label}`);
      }
    }

    console.log('\n🎉 HR Child Menu Items Setup Complete!');
    console.log('📋 Summary:');
    console.log('   HR (Parent Menu)');
    console.log('   ├── Designations (/hr/designations)');
    console.log('   └── Employees (/hr/employees)');

  } catch (error) {
    console.error('❌ Error creating HR child menu items:', error);
  } finally {
    mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
};

createHRChildMenuItems();