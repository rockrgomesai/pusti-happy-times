// create-outlets-permissions.js
// MongoDB Shell Script to create API permissions for the Outlets module
// Run this script using: mongosh tkgerp < create-outlets-permissions.js

// Insert outlet permissions
const outletPermissions = [
  {
    api_permissions: 'outlets:read',
    description: 'View outlets list and details',
    module: 'Routes & Outlets',
    active: true,
  },
  {
    api_permissions: 'outlets:create',
    description: 'Create new outlets',
    module: 'Routes & Outlets',
    active: true,
  },
  {
    api_permissions: 'outlets:update',
    description: 'Update existing outlets',
    module: 'Routes & Outlets',
    active: true,
  },
  {
    api_permissions: 'outlets:delete',
    description: 'Deactivate outlets',
    module: 'Routes & Outlets',
    active: true,
  },
];

outletPermissions.forEach((permission) => {
  const existing = db.api_permissions.findOne({ api_permissions: permission.api_permissions });
  
  if (existing) {
    print(`Permission already exists: ${permission.api_permissions}`);
  } else {
    db.api_permissions.insertOne(permission);
    print(`✓ Created permission: ${permission.api_permissions}`);
  }
});

print('\nAll outlet permissions created successfully!');
print('Next step: Run create-roles-outlet-permissions.js to assign these permissions to roles');
