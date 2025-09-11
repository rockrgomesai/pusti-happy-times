/**
 * Seed Sidebar Menu for Categories under Master
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const { SidebarMenuItem, Role, RoleSidebarMenuItem } = require('../models');

async function run() {
  try {
    await connectDB();

    // Find or create Master parent (match by label or href)
    let master = await SidebarMenuItem.findOne({ $or: [{ href: '/master' }, { label: 'Master' }] });
    if (!master) {
      try {
        master = await SidebarMenuItem.create({
          label: 'Master',
          href: '/master',
          m_order: 100,
          icon: 'FaDatabase',
          parent_id: null,
          is_submenu: true,
        });
        console.log('🌱 Created Master menu');
      } catch (e) {
        if (e?.code === 11000) {
          master = await SidebarMenuItem.findOne({ $or: [{ href: '/master' }, { label: 'Master' }] });
          console.log('ℹ️ Master menu already exists, using existing');
        } else {
          throw e;
        }
      }
    }

    // Create Categories child
    let categories = await SidebarMenuItem.findOne({ href: '/master/categories' });
    if (!categories) {
      categories = await SidebarMenuItem.create({
        label: 'Categories',
        href: '/master/categories',
        m_order: 120,
        icon: 'FaLayerGroup',
        parent_id: master._id,
        is_submenu: false,
      });
      console.log('🌱 Created Categories menu');
    } else {
      // Ensure icon and parent are correct
      const needsUpdate = categories.icon !== 'FaLayerGroup' || String(categories.parent_id) !== String(master._id);
      if (needsUpdate) {
        categories.icon = 'FaLayerGroup';
        categories.parent_id = master._id;
        await categories.save();
        console.log('🔧 Updated Categories menu');
      }
    }

    // Bind to SuperAdmin role if exists
    const superAdmin = await Role.findOne({ role: 'SuperAdmin' });
    if (superAdmin) {
      const existingBind = await RoleSidebarMenuItem.findOne({
        role_id: superAdmin._id,
        sidebar_menu_item_id: categories._id,
      });
      if (!existingBind) {
        await RoleSidebarMenuItem.create({
          role_id: superAdmin._id,
          sidebar_menu_item_id: categories._id,
        });
        console.log('🔗 Bound Categories menu to SuperAdmin');
      }
    }
  } catch (err) {
    console.error('❌ Menu seed failed:', err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.connection.close(); } catch {}
  }
}

run();
