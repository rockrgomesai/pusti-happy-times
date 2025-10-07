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

const assignHRMenuToSuperAdmin = async () => {
  try {
    await connectDB();

    console.log('🔍 Finding SuperAdmin role and HR menu item...');

    // Find SuperAdmin role
    const superAdminRole = await Role.findOne({ role: 'SuperAdmin' });
    if (!superAdminRole) {
      console.error('❌ SuperAdmin role not found');
      return;
    }
    console.log('✅ SuperAdmin role found:', superAdminRole._id);

    // Find HR menu item
    const hrMenuItem = await SidebarMenuItem.findOne({ 
      label: 'HR',
      parent_id: null 
    });
    if (!hrMenuItem) {
      console.error('❌ HR menu item not found');
      return;
    }
    console.log('✅ HR menu item found:', hrMenuItem._id);

    // Check if permission already exists
    const existingPermission = await RoleSidebarMenuItem.findOne({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: hrMenuItem._id
    });

    if (existingPermission) {
      console.log('⚠️ SuperAdmin already has HR menu access');
      return;
    }

    // Create menu permission
    console.log('📝 Assigning HR menu access to SuperAdmin...');
    const menuPermission = await RoleSidebarMenuItem.create({
      role_id: superAdminRole._id,
      sidebar_menu_item_id: hrMenuItem._id
    });

    console.log('✅ HR menu access granted to SuperAdmin!');
    console.log('📋 Permission Details:');
    console.log(`   - Permission ID: ${menuPermission._id}`);
    console.log(`   - Role: SuperAdmin (${superAdminRole._id})`);
    console.log(`   - Menu Item: HR (${hrMenuItem._id})`);

  } catch (error) {
    console.error('❌ Error assigning HR menu to SuperAdmin:', error);
  } finally {
    mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
};

assignHRMenuToSuperAdmin();