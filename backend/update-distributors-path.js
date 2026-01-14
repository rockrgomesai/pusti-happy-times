// Update Distributors menu item path from /demandorder/distributors to /distributor/distributors
// Run this with: node update-distributors-path.js

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times';

async function updateDistributorsPath() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const menuCollection = db.collection('sidebar_menu_items');

    // Update Distributors menu item href
    const result = await menuCollection.updateOne(
      { label: 'Distributors' },
      { $set: { href: '/distributor/distributors' } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Updated Distributors menu path to /distributor/distributors');
    } else {
      console.log('⚠️  Distributors menu item not found or already updated');
    }

    // Display updated menu item
    const distributorsMenu = await menuCollection.findOne({ label: 'Distributors' });
    if (distributorsMenu) {
      console.log('\n📋 Updated Distributors menu:');
      console.log(`  Label: ${distributorsMenu.label}`);
      console.log(`  Path: ${distributorsMenu.href}`);
      console.log(`  Is Submenu: ${distributorsMenu.is_submenu}`);
    }

    console.log('\n✅ Path update complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

updateDistributorsPath();
