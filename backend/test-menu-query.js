const mongoose = require('mongoose');

async function testMenuQuery() {
  try {
    await mongoose.connect('mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin');
    
    // Import models after connection
    const { User, RoleSidebarMenuItem, SidebarMenuItem } = require('./src/models');
    
    // Find a user role ID
    const user = await User.findOne({ username: 'SuperAdmin' }).populate('role_id');
    console.log('User role ID:', user.role_id._id);
    
    // Test the same query the route uses
    const roleMenuItems = await RoleSidebarMenuItem.find({
      role_id: user.role_id._id,
    })
      .populate({
        path: "sidebar_menu_item_id",
        populate: {
          path: "parent_id",
          select: "label",
        },
      })
      .lean();
    
    console.log('Role menu items found:', roleMenuItems.length);
    
    if (roleMenuItems.length > 0) {
      console.log('Sample item:', JSON.stringify(roleMenuItems[0], null, 2));
    }
    
    // Extract populated menu item documents, filter out any null
    const menuItems = roleMenuItems
      .map((item) => item.sidebar_menu_item_id)
      .filter(Boolean);
    
    console.log('Filtered menu items:', menuItems.length);
    
    if (menuItems.length > 0) {
      console.log('Sample menu item keys:', Object.keys(menuItems[0]));
      
      // Test the hierarchy builder
      console.log('\nTesting hierarchy builder...');
      
      const buildMenuHierarchy = (menuItems) => {
        const menuMap = new Map();
        const rootItems = [];
      
        // Create a map of all items
        menuItems.forEach((item) => {
          const base = typeof item.toObject === 'function' ? item.toObject() : item; // support lean objects
          if (!base || !base._id) {
            console.warn('[user-menu] Skipping item without _id during map build:', base);
            return;
          }
          menuMap.set(base._id.toString(), { ...base, children: [] });
        });
      
        // Build hierarchy
        menuItems.forEach((item) => {
          if (!item || !item._id) {
            console.warn('[user-menu] Skipping hierarchy item without _id:', item);
            return;
          }
          const key = item._id.toString();
          const menuItem = menuMap.get(key);
          if (!menuItem) {
            console.warn('[user-menu] Item missing in map (possibly skipped earlier):', key);
            return;
          }
          
          if (item.parent_id) {
            const parent = menuMap.get(item.parent_id._id?.toString() || item.parent_id.toString());
            if (parent) {
              parent.children.push(menuItem);
            } else {
              rootItems.push(menuItem);
            }
          } else {
            rootItems.push(menuItem);
          }
        });
      
        return rootItems;
      };
      
      const hierarchy = buildMenuHierarchy(menuItems);
      console.log('Hierarchy built successfully:', hierarchy.length, 'root items');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testMenuQuery();