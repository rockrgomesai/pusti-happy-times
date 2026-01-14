// Fix and verify DSR menu items
const mongoose = require('mongoose');

async function fixDSRMenu() {
  try {
    await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const menuCollection = db.collection('sidebar_menu_items');
    const roleMenuCollection = db.collection('role_sidebar_menu_items');
    const rolesCollection = db.collection('roles');

    // Fix Distributor parent menu href if it's null
    await menuCollection.updateOne(
      { label: 'Distributor' },
      { $set: { href: '/distributor' } }
    );
    console.log('✅ Updated Distributor parent menu href');

    // Get all distributor-related menu items
    const distributorMenu = await menuCollection.findOne({ label: 'Distributor' });
    const dsrMenu = await menuCollection.findOne({ label: 'DSR' });
    const distributorsMenu = await menuCollection.findOne({ label: 'Distributors' });

    console.log('\n📋 Menu Items:');
    console.log('Distributor:', distributorMenu);
    console.log('DSR:', dsrMenu);
    console.log('Distributors:', distributorsMenu);

    // Get all roles
    const roles = await rolesCollection.find({}).toArray();
    console.log('\n📋 Roles:', roles.map(r => r.role));

    // Assign DSR menu to relevant roles (SuperAdmin, Sales Admin, etc.)
    const adminRoles = ['SuperAdmin', 'Sales Admin', 'Office Admin', 'MIS'];
    
    for (const roleName of adminRoles) {
      const role = await rolesCollection.findOne({ role: roleName });
      if (role && dsrMenu) {
        // Check if already assigned
        const existing = await roleMenuCollection.findOne({
          role_id: role._id,
          sidebar_menu_item_id: dsrMenu._id
        });

        if (!existing) {
          await roleMenuCollection.insertOne({
            role_id: role._id,
            sidebar_menu_item_id: dsrMenu._id
          });
          console.log(`✅ Assigned DSR menu to ${roleName}`);
        } else {
          console.log(`⚠️  DSR menu already assigned to ${roleName}`);
        }
      }
    }

    // Also assign Distributor parent menu to same roles
    for (const roleName of adminRoles) {
      const role = await rolesCollection.findOne({ role: roleName });
      if (role && distributorMenu) {
        const existing = await roleMenuCollection.findOne({
          role_id: role._id,
          sidebar_menu_item_id: distributorMenu._id
        });

        if (!existing) {
          await roleMenuCollection.insertOne({
            role_id: role._id,
            sidebar_menu_item_id: distributorMenu._id
          });
          console.log(`✅ Assigned Distributor menu to ${roleName}`);
        } else {
          console.log(`⚠️  Distributor menu already assigned to ${roleName}`);
        }
      }
    }

    console.log('\n✅ DSR menu setup and permissions complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

fixDSRMenu();
