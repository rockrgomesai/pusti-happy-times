// Add DSR menu item to sidebar_menu_items collection
// Run this with: node add-dsr-menu.js

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function setupDSRMenu() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const menuCollection = db.collection('sidebar_menu_items');

    // Step 1: Find or create "Distributor" parent menu with parent_id: null
    let distributorMenu = await menuCollection.findOne({ label: 'Distributor' });
    let distributorMenuId;

    if (!distributorMenu) {
      // Create Distributor parent menu
      const result = await menuCollection.insertOne({
        label: 'Distributor',
        href: null, // Parent menus don't have href
        m_order: 10,
        icon: 'FaStore',
        parent_id: null, // This is a top-level parent menu
        is_submenu: false
      });
      distributorMenuId = result.insertedId;
      console.log('✅ Created Distributor parent menu');
    } else {
      distributorMenuId = distributorMenu._id;
      // Update existing to ensure it's a proper parent
      await menuCollection.updateOne(
        { _id: distributorMenuId },
        { 
          $set: { 
            parent_id: null,
            is_submenu: false,
            href: null
          }
        }
      );
      console.log('✅ Updated Distributor to be a parent menu');
    }

    // Step 2: Find and move "Distributors" menu from Order Management to Distributor parent
    const distributorsMenu = await menuCollection.findOne({ label: 'Distributors' });
    
    if (distributorsMenu) {
      await menuCollection.updateOne(
        { _id: distributorsMenu._id },
        { 
          $set: { 
            parent_id: distributorMenuId,
            is_submenu: true,
            m_order: 1 // First submenu
          }
        }
      );
      console.log('✅ Moved Distributors under Distributor parent menu');
    } else {
      // Create Distributors submenu if it doesn't exist
      await menuCollection.insertOne({
        label: 'Distributors',
        href: '/demandorder/distributors',
        m_order: 1,
        icon: 'FaStoreAlt',
        parent_id: distributorMenuId,
        is_submenu: true
      });
      console.log('✅ Created Distributors submenu');
    }

    // Step 3: Check if DSR submenu already exists
    const dsrMenu = await menuCollection.findOne({ label: 'DSR' });

    if (!dsrMenu) {
      // Add DSR submenu
      await menuCollection.insertOne({
        label: 'DSR',
        href: '/distributor/dsrs',
        m_order: 2, // Second submenu
        icon: 'FaUserTie',
        parent_id: distributorMenuId,
        is_submenu: true
      });
      console.log('✅ Added DSR submenu');
    } else {
      // Update existing DSR to be under correct parent
      await menuCollection.updateOne(
        { _id: dsrMenu._id },
        { 
          $set: { 
            parent_id: distributorMenuId,
            is_submenu: true,
            m_order: 2
          }
        }
      );
      console.log('✅ Updated DSR submenu');
    }

    // Display all Distributor-related menu items
    console.log('\n📋 Current Distributor menu structure:');
    const allDistributorMenus = await menuCollection.find({
      $or: [
        { label: 'Distributor' },
        { parent_id: distributorMenuId }
      ]
    }).sort({ m_order: 1 }).toArray();

    allDistributorMenus.forEach(item => {
      console.log(`  ${item.is_submenu ? '  └─' : '●'} ${item.label} (${item.href || 'parent'})`);
    });

    console.log('\n✅ DSR menu setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

setupDSRMenu();
