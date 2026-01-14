// Add DSR menu item to sidebar_menu_items collection
// Run with: node add-dsr-menu-node.js

const mongoose = require('mongoose');

async function addDSRMenu() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const menuCollection = db.collection('sidebar_menu_items');

    // First, check if "Distributor" parent menu exists
    const distributorMenu = await menuCollection.findOne({ label: 'Distributor' });

    let distributorMenuId;

    if (!distributorMenu) {
      // Create Distributor parent menu if it doesn't exist
      const result = await menuCollection.insertOne({
        label: 'Distributor',
        href: '/distributor',
        m_order: 10,
        icon: 'FaStore',
        parent_id: null,
        is_submenu: false
      });
      distributorMenuId = result.insertedId;
      console.log('✅ Created Distributor parent menu');
    } else {
      distributorMenuId = distributorMenu._id;
      console.log('✅ Found existing Distributor parent menu');
    }

    // Check if DSR submenu already exists
    const dsrMenu = await menuCollection.findOne({ label: 'DSR' });

    if (!dsrMenu) {
      // Add DSR submenu
      await menuCollection.insertOne({
        label: 'DSR',
        href: '/distributor/dsrs',
        m_order: 11,
        icon: 'FaUserTie',
        parent_id: distributorMenuId,
        is_submenu: true
      });
      console.log('✅ Added DSR submenu');
    } else {
      console.log('⚠️  DSR menu item already exists');
    }

    // Check if "Distributors" submenu exists
    const distributorsMenu = await menuCollection.findOne({ label: 'Distributors' });

    if (!distributorsMenu) {
      // Add Distributors submenu
      await menuCollection.insertOne({
        label: 'Distributors',
        href: '/demandorder/distributors',
        m_order: 12,
        icon: 'FaStoreAlt',
        parent_id: distributorMenuId,
        is_submenu: true
      });
      console.log('✅ Added Distributors submenu');
    } else {
      console.log('⚠️  Distributors menu item already exists');
    }

    // Display all Distributor-related menu items
    console.log('\n📋 Current Distributor menu structure:');
    const items = await menuCollection.find({
      $or: [
        { label: 'Distributor' },
        { parent_id: distributorMenuId }
      ]
    }).toArray();

    items.forEach(item => {
      console.log(`  ${item.is_submenu ? '  └─' : '●'} ${item.label} (${item.href})`);
    });

    console.log('\n✅ DSR menu setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

addDSRMenu();
