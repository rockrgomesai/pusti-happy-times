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

// Import SidebarMenuItem model
const { SidebarMenuItem } = require('./src/models');

const createHRMenuItem = async () => {
  try {
    await connectDB();

    console.log('📝 Creating HR menu item...');

    // Check if HR menu item already exists
    const existingHRMenuItem = await SidebarMenuItem.findOne({ 
      label: 'HR',
      parent_id: null 
    });

    if (existingHRMenuItem) {
      console.log('⚠️ HR menu item already exists:', existingHRMenuItem._id);
      return;
    }

    // Create HR menu item with exact specifications
    const hrMenuItem = await SidebarMenuItem.create({
      label: 'HR',
      href: null,
      m_order: 14,
      icon: 'FaPeople',
      parent_id: null,
      is_submenu: false
    });

    console.log('✅ HR menu item created successfully!');
    console.log('📋 Menu Item Details:');
    console.log(`   - ID: ${hrMenuItem._id}`);
    console.log(`   - Label: ${hrMenuItem.label}`);
    console.log(`   - href: ${hrMenuItem.href}`);
    console.log(`   - m_order: ${hrMenuItem.m_order}`);
    console.log(`   - icon: ${hrMenuItem.icon}`);
    console.log(`   - parent_id: ${hrMenuItem.parent_id}`);
    console.log(`   - is_submenu: ${hrMenuItem.is_submenu}`);

  } catch (error) {
    console.error('❌ Error creating HR menu item:', error);
  } finally {
    mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
};

createHRMenuItem();