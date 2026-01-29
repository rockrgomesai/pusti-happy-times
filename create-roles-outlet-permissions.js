// create-roles-outlet-permissions.js
// MongoDB Shell Script to assign outlet permissions to roles
// Run this script AFTER create-outlets-permissions.js
// Usage: mongosh tkgerp < create-roles-outlet-permissions.js

// Role permissions mapping based on requirements:
// - SuperAdmin, Sales Admin, ZSM, RSM, ASM, SO, MIS: full permission
// - SO: cannot delete (read, create, update only)
// - Distributor and DSR: view only (read)

const rolePermissionsMapping = {
  SuperAdmin: ['outlets:read', 'outlets:create', 'outlets:update', 'outlets:delete'],
  'Sales Admin': ['outlets:read', 'outlets:create', 'outlets:update', 'outlets:delete'],
  ZSM: ['outlets:read', 'outlets:create', 'outlets:update', 'outlets:delete'],
  RSM: ['outlets:read', 'outlets:create', 'outlets:update', 'outlets:delete'],
  ASM: ['outlets:read', 'outlets:create', 'outlets:update', 'outlets:delete'],
  MIS: ['outlets:read', 'outlets:create', 'outlets:update', 'outlets:delete'],
  SO: ['outlets:read', 'outlets:create', 'outlets:update'], // No delete
  Distributor: ['outlets:read'], // View only
  DSR: ['outlets:read'], // View only
};

// Get all outlet permissions
const outletPermissions = db.api_permissions.find({ api_permissions: /^outlets:/ }).toArray();

if (outletPermissions.length === 0) {
  print('ERROR: No outlet permissions found!');
  print('Please run create-outlets-permissions.js first');
  quit(1);
}

print(`Found ${outletPermissions.length} outlet permissions\n`);

// Create a map of permission strings to ObjectIds
const permissionMap = {};
outletPermissions.forEach((perm) => {
  permissionMap[perm.api_permissions] = perm._id;
});

// Process each role
Object.keys(rolePermissionsMapping).forEach((roleName) => {
  const role = db.roles.findOne({ role: roleName });

  if (!role) {
    print(`⚠ Role not found: ${roleName} - Skipping`);
    return;
  }

  const permissionStrings = rolePermissionsMapping[roleName];
  
  print(`\n✓ Processing role: ${roleName} (${role._id})`);

  // Convert permission strings to ObjectIds and create junction table entries
  permissionStrings.forEach((permStr) => {
    const permId = permissionMap[permStr];
    if (!permId) {
      print(`  ⚠ Permission not found: ${permStr}`);
      return;
    }

    // Check if junction table entry already exists
    const existing = db.roles_api_permissions.findOne({
      role_id: role._id,
      api_permission_id: permId,
    });

    if (existing) {
      print(`  - Already assigned: ${permStr}`);
    } else {
      db.roles_api_permissions.insertOne({
        role_id: role._id,
        api_permission_id: permId,
      });
      print(`  ✓ Assigned: ${permStr}`);
    }
  });
});

print('\n✅ Outlet permissions successfully assigned to roles!');
print('\nPermission Summary:');
print('==================');
print('Full Access (Create, Read, Update, Delete):');
print('  - SuperAdmin, Sales Admin, ZSM, RSM, ASM, MIS');
print('\nLimited Access (Create, Read, Update - NO Delete):');
print('  - SO');
print('\nView Only (Read):');
print('  - Distributor, DSR');
