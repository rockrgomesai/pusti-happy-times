// Quick test script for user-menu endpoint
const mongoose = require('mongoose');
const express = require('express');
require('dotenv').config();

// Import models
const { User, RoleSidebarMenuItem } = require('./src/models');

async function testUserMenu() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
    console.log('Connected to MongoDB');

    // Find superadmin user
    const user = await User.findOne({ username: 'superadmin' }).populate('role_id');
    if (!user) {
      console.error('Superadmin user not found');
      return;
    }

    console.log('User found:', user.username, 'Role:', user.role_id?.role);
    
    // Extract role ID - handle both populated and non-populated cases
    const userRoleId = user.role_id?._id || user.role_id;
    console.log('User role ID:', userRoleId.toString());

    if (!userRoleId) {
      console.error('User role not found');
      return;
    }

    // Get menu items accessible to user's role
    const roleMenuItems = await RoleSidebarMenuItem.find({
      role_id: userRoleId,
    })
      .populate({
        path: "sidebar_menu_item_id",
        populate: {
          path: "parent_id",
          select: "label",
        },
      })
      .lean();

    console.log('Role menu items count:', roleMenuItems.length);
    
    // Extract populated menu item documents, filter out any null (dangling assignments)
    const menuItems = roleMenuItems
      .map((item) => item.sidebar_menu_item_id)
      .filter(Boolean);

    console.log('Filtered menu items count:', menuItems.length);
    
    if (menuItems.length > 0) {
      console.log('Sample menu item keys:', Object.keys(menuItems[0]));
      console.log('Sample menu item:', JSON.stringify(menuItems[0], null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

testUserMenu();
