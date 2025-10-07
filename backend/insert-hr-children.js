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

const insertHRChildMenuItems = async () => {
  try {
    await connectDB();

    console.log('🔍 Finding HR parent menu item...');

    // Get direct access to the collection
    const db = mongoose.connection.db;
    const sidebarMenuCollection = db.collection('sidebar_menu_items');

    // Find HR parent menu item
    const hrParentMenu = await sidebarMenuCollection.findOne({ 
      label: 'HR',
      parent_id: null 
    });

    if (!hrParentMenu) {
      console.error('❌ HR parent menu item not found');
      return;
    }
    console.log('✅ HR parent menu found:', hrParentMenu._id);

    // Define the two child menu items to insert
    const childMenuItems = [
      {
        label: 'Designations',
        href: '/hr/designations',
        m_order: 1,
        icon: 'FaUserTie',
        parent_id: hrParentMenu._id,
        is_submenu: true
      },
      {
        label: 'Employees',
        href: '/hr/employees',
        m_order: 2,
        icon: 'FaUsers',
        parent_id: hrParentMenu._id,
        is_submenu: true
      }
    ];

    console.log('📝 Inserting HR child menu items...');

    for (const menuItem of childMenuItems) {
      // Check if menu item already exists
      const existingItem = await sidebarMenuCollection.findOne({
        label: menuItem.label,
        parent_id: hrParentMenu._id
      });

      if (existingItem) {
        console.log(`⚠️ ${menuItem.label} menu item already exists`);
        continue;
      }

      // Insert the menu item
      const result = await sidebarMenuCollection.insertOne(menuItem);
      console.log(`✅ ${menuItem.label} menu item created with ID:`, result.insertedId);
    }

    console.log('\n🎉 HR Child Menu Items Created Successfully!');
    console.log('📋 Menu Structure:');
    console.log('   HR (Parent Menu)');
    console.log('   ├── Designations (/hr/designations) - FaUserTie');
    console.log('   └── Employees (/hr/employees) - FaUsers');

  } catch (error) {
    console.error('❌ Error inserting HR child menu items:', error);
  } finally {
    mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
};

insertHRChildMenuItems();