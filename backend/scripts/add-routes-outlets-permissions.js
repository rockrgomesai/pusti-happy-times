// Script to add Routes & Outlets module API permissions
// Run this script using: mongosh mongodb://localhost:27017/pusti_happy_times < add-routes-outlets-permissions.js

print("========================================");
print("Adding Routes & Outlets API Permissions");
print("========================================");

// Switch to the database
db = db.getSiblingDB("pusti_happy_times");

// Define the new API permissions
const newPermissions = [
  // Outlet Types
  "outlet-types:read",
  "outlet-types:create",
  "outlet-types:update",
  "outlet-types:delete",

  // Outlet Channels
  "outlet-channels:read",
  "outlet-channels:create",
  "outlet-channels:update",
  "outlet-channels:delete",

  // Outlet Market Sizes
  "outlet-market-sizes:read",
  "outlet-market-sizes:create",
  "outlet-market-sizes:update",
  "outlet-market-sizes:delete",
];

print("\n1. Creating API Permissions...");
const createdPermissions = [];

newPermissions.forEach((permission) => {
  const existing = db.api_permissions.findOne({ api_permissions: permission });
  if (existing) {
    print(`   ✓ Permission already exists: ${permission}`);
    createdPermissions.push(existing);
  } else {
    const result = db.api_permissions.insertOne({
      api_permissions: permission,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const inserted = db.api_permissions.findOne({ _id: result.insertedId });
    createdPermissions.push(inserted);
    print(`   ✓ Created permission: ${permission}`);
  }
});

print(`\nTotal permissions processed: ${createdPermissions.length}`);

// Define roles that should have full access to these lookup tables
const roleNames = ["SuperAdmin", "SalesAdmin", "MIS", "ZSM", "RSM", "ASM"];

print("\n2. Assigning permissions to roles...");
let assignmentCount = 0;

roleNames.forEach((roleName) => {
  const role = db.roles.findOne({ role: roleName });

  if (!role) {
    print(`   ⚠ Role not found: ${roleName}`);
    return;
  }

  print(`\n   Processing role: ${roleName} (${role._id})`);

  createdPermissions.forEach((permission) => {
    const existing = db.roles_api_permissions.findOne({
      role_id: role._id,
      api_permission_id: permission._id,
    });

    if (!existing) {
      db.roles_api_permissions.insertOne({
        role_id: role._id,
        api_permission_id: permission._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
      assignmentCount++;
      print(`     ✓ Assigned: ${permission.api_permissions}`);
    } else {
      print(`     - Already assigned: ${permission.api_permissions}`);
    }
  });
});

print(`\n========================================`);
print(`✓ Script completed successfully!`);
print(`  - Permissions created/verified: ${createdPermissions.length}`);
print(`  - New role-permission assignments: ${assignmentCount}`);
print("========================================\n");
