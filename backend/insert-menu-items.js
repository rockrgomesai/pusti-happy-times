/**
 * Insert Factories and Depots Menu Items
 * Script to add factory and depot menu items to the sidebar_menu_items collection
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti-ht-mern');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const insertMenuItems = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('sidebar_menu_items');
    
    // Menu items to insert
    const menuItems = [
      {
        label: "Factories",
        href: "/master/factories",
        m_order: 12.1,
        icon: "FaFactory",
        parent_id: new mongoose.Types.ObjectId('68be2a2337d76ea524fa3350'),
        is_submenu: true
      },
      {
        label: "Depots",
        href: "/master/depots",
        m_order: 12.2, // Changed to 12.2 to avoid duplicate order
        icon: "FaWarehouse",
        parent_id: new mongoose.Types.ObjectId('68be2a2337d76ea524fa3350'),
        is_submenu: true
      }
    ];
    
    // Check if menu items already exist
    const existingItems = await collection.find({
      $or: [
        { href: "/master/factories" },
        { href: "/master/depots" }
      ]
    }).toArray();
    
    if (existingItems.length > 0) {
      console.log('⚠️  Some menu items already exist:');
      existingItems.forEach(item => {
        console.log(`   - ${item.label} (${item.href})`);
      });
    }
    
    // Insert new menu items (skip duplicates)
    const existingHrefs = existingItems.map(item => item.href);
    const newMenuItems = menuItems.filter(item => 
      !existingHrefs.includes(item.href)
    );
    
    if (newMenuItems.length > 0) {
      const result = await collection.insertMany(newMenuItems);
      console.log(`✅ Successfully inserted ${result.insertedCount} menu items:`);
      newMenuItems.forEach(item => {
        console.log(`   - ${item.label} (${item.href}) - Order: ${item.m_order}`);
      });
    } else {
      console.log('ℹ️  All menu items already exist. No new items inserted.');
    }
    
    // Verify the insertion and show parent context
    console.log('\n📋 Verifying menu items under parent ID 68be2a2337d76ea524fa3350:');
    const parentMenuItems = await collection.find({
      parent_id: new mongoose.Types.ObjectId('68be2a2337d76ea524fa3350')
    }).sort({ m_order: 1 }).toArray();
    
    parentMenuItems.forEach(item => {
      console.log(`   - ${item.label} (${item.href}) - Order: ${item.m_order} - ID: ${item._id}`);
    });
    
    // Show parent menu info
    const parentMenu = await collection.findOne({
      _id: new mongoose.Types.ObjectId('68be2a2337d76ea524fa3350')
    });
    
    if (parentMenu) {
      console.log(`\n🔗 Parent Menu: ${parentMenu.label} (${parentMenu.href})`);
    }
    
  } catch (error) {
    console.error('❌ Error inserting menu items:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed.');
    process.exit(0);
  }
};

// Run the script
insertMenuItems();