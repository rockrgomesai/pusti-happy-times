// Fix Distributor Menu Structure - Production
// This script cleans up and fixes the Distributor menu hierarchy
// Run with: node fix-distributor-menu-structure.js

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function fixDistributorMenuStructure() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const menuCollection = db.collection('sidebar_menu_items');
    const roleMenuCollection = db.collection('role_sidebar_menu_items');

    console.log('🔍 Checking current menu structure...\n');

    // Find all Distributor-related menus
    const allDistributorMenus = await menuCollection.find({
      label: { $in: ['Distributor', 'Distributors', 'DSR'] }
    }).toArray();

    console.log('📋 Current Distributor-related menus:');
    allDistributorMenus.forEach(menu => {
      console.log(`  - ${menu.label}: ${menu.href || 'null'} (parent_id: ${menu.parent_id || 'null'}, is_submenu: ${menu.is_submenu})`);
    });

    // Step 1: Find or create the correct parent menu
    console.log('\n🔧 STEP 1: Setting up Distributor parent menu...');
    
    let distributorParent = await menuCollection.findOne({ 
      label: 'Distributor',
      parent_id: null 
    });

    if (!distributorParent) {
      // Create the parent menu
      const result = await menuCollection.insertOne({
        label: 'Distributor',
        href: '/distributor',
        m_order: 10,
        icon: 'FaStore',
        parent_id: null,
        is_submenu: false
      });
      distributorParent = await menuCollection.findOne({ _id: result.insertedId });
      console.log('✅ Created Distributor parent menu');
    } else {
      // Ensure it has the correct href
      await menuCollection.updateOne(
        { _id: distributorParent._id },
        { 
          $set: { 
            href: '/distributor',
            parent_id: null,
            is_submenu: false,
            icon: 'FaStore'
          }
        }
      );
      console.log('✅ Updated Distributor parent menu');
    }

    const distributorParentId = distributorParent._id;

    // Step 2: Delete old Distributors menu with wrong path
    console.log('\n🔧 STEP 2: Cleaning up old Distributors menu items...');
    
    const oldDistributorsMenus = await menuCollection.find({
      label: 'Distributors',
      href: '/demandorder/distributors'
    }).toArray();

    for (const oldMenu of oldDistributorsMenus) {
      // Remove role assignments for old menu
      await roleMenuCollection.deleteMany({
        sidebar_menu_item_id: oldMenu._id
      });
      // Delete old menu
      await menuCollection.deleteOne({ _id: oldMenu._id });
      console.log(`✅ Deleted old Distributors menu (${oldMenu.href})`);
    }

    // Step 3: Create/Update Distributors submenu with correct path
    console.log('\n🔧 STEP 3: Setting up Distributors submenu...');
    
    let distributorsMenu = await menuCollection.findOne({
      label: 'Distributors',
      href: '/distributor/distributors'
    });

    if (!distributorsMenu) {
      const result = await menuCollection.insertOne({
        label: 'Distributors',
        href: '/distributor/distributors',
        m_order: 1,
        icon: 'FaStoreAlt',
        parent_id: distributorParentId,
        is_submenu: true
      });
      distributorsMenu = await menuCollection.findOne({ _id: result.insertedId });
      console.log('✅ Created Distributors submenu');
    } else {
      await menuCollection.updateOne(
        { _id: distributorsMenu._id },
        { 
          $set: { 
            href: '/distributor/distributors',
            parent_id: distributorParentId,
            is_submenu: true,
            m_order: 1,
            icon: 'FaStoreAlt'
          }
        }
      );
      console.log('✅ Updated Distributors submenu');
    }

    // Step 4: Create/Update DSR submenu
    console.log('\n🔧 STEP 4: Setting up DSR submenu...');
    
    let dsrMenu = await menuCollection.findOne({
      label: 'DSR'
    });

    if (!dsrMenu) {
      const result = await menuCollection.insertOne({
        label: 'DSR',
        href: '/distributor/dsrs',
        m_order: 2,
        icon: 'FaUserTie',
        parent_id: distributorParentId,
        is_submenu: true
      });
      dsrMenu = await menuCollection.findOne({ _id: result.insertedId });
      console.log('✅ Created DSR submenu');
    } else {
      await menuCollection.updateOne(
        { _id: dsrMenu._id },
        { 
          $set: { 
            href: '/distributor/dsrs',
            parent_id: distributorParentId,
            is_submenu: true,
            m_order: 2,
            icon: 'FaUserTie'
          }
        }
      );
      console.log('✅ Updated DSR submenu');
    }

    // Step 5: Verify and display final structure
    console.log('\n' + '═'.repeat(60));
    console.log('✅ FINAL MENU STRUCTURE');
    console.log('═'.repeat(60));

    const finalMenus = await menuCollection.find({
      $or: [
        { _id: distributorParentId },
        { parent_id: distributorParentId }
      ]
    }).sort({ m_order: 1 }).toArray();

    console.log('\n🗂️  Distributor Menu Hierarchy:');
    finalMenus.forEach(menu => {
      const indent = menu.is_submenu ? '  └─ ' : '● ';
      console.log(`${indent}${menu.label.padEnd(20)} → ${menu.href || 'parent'}`);
      console.log(`     ID: ${menu._id}, parent_id: ${menu.parent_id || 'null'}, is_submenu: ${menu.is_submenu}`);
    });

    console.log('\n📝 Important Notes:');
    console.log('─'.repeat(60));
    console.log('1. Users MUST log out and log back in to see changes');
    console.log('2. Clear browser cache if menu still not showing');
    console.log('3. Verify role permissions are assigned in Permissions Management');
    console.log('4. Check that parent_id matches the Distributor menu _id');
    
    console.log('\n✅ Menu structure fixed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB\n');
  }
}

fixDistributorMenuStructure();
