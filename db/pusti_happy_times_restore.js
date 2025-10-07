// MongoDB Database Restore Script for pusti_happy_times
// This script recreates the entire database with all collections, indexes, and data
// Run this script with: mongosh --host localhost --port 27017 -u admin -p password123 --authenticationDatabase admin

// Switch to pusti_happy_times database
use pusti_happy_times;

// Drop existing collections if they exist
db.getCollectionNames().forEach(function(collection) {
    db[collection].drop();
});

// ============================================================================
// CREATE COLLECTIONS WITH VALIDATION SCHEMAS
// ============================================================================

// 1. Create roles collection
db.createCollection('roles', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['role'],
      properties: {
        role: {
          bsonType: 'string'
        }
      }
    }
  }
});
db.roles.createIndex({ role: 1 }, { unique: true });

// 2. Create users collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'password', 'role_id', 'email', 'active', 'created_at', 'created_by', 'updated_at', 'updated_by'],
      properties: {
        username: {
          bsonType: 'string'
        },
        password: {
          bsonType: 'string'
        },
        role_id: {
          bsonType: 'objectId'
        },
        email: {
          bsonType: 'string'
        },
        active: {
          bsonType: 'bool'
        },
        created_at: {
          bsonType: 'date'
        },
        created_by: {
          bsonType: 'objectId'
        },
        updated_at: {
          bsonType: 'date'
        },
        updated_by: {
          bsonType: 'objectId'
        }
      }
    }
  }
});
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });

// 3. Create sidebar_menu_items collection
db.createCollection('sidebar_menu_items', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['label', 'href', 'm_order', 'icon', 'is_submenu'],
      properties: {
        label: {
          bsonType: 'string'
        },
        href: {
          bsonType: 'string'
        },
        m_order: {
          bsonType: 'int'
        },
        icon: {
          bsonType: 'string'
        },
        parent_id: {
          bsonType: ['objectId', 'null']
        },
        is_submenu: {
          bsonType: 'bool'
        }
      }
    }
  }
});

// 4. Create role_sidebar_menu_items collection
db.createCollection('role_sidebar_menu_items', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['role_id', 'sidebar_menu_item_id'],
      properties: {
        role_id: {
          bsonType: 'objectId'
        },
        sidebar_menu_item_id: {
          bsonType: 'objectId'
        }
      }
    }
  }
});

// 5. Create brands collection
db.createCollection('brands', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['brand', 'created_at', 'created_by', 'updated_at', 'updated_by'],
      properties: {
        brand: {
          bsonType: 'string'
        },
        created_at: {
          bsonType: 'date'
        },
        created_by: {
          bsonType: 'objectId'
        },
        updated_at: {
          bsonType: 'date'
        },
        updated_by: {
          bsonType: 'objectId'
        }
      }
    }
  }
});
db.brands.createIndex({ brand: 1 }, { unique: true });

// 6. Create api_permissions collection
db.createCollection('api_permissions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['api_permissions'],
      properties: {
        api_permissions: {
          bsonType: 'string'
        }
      }
    }
  }
});
db.api_permissions.createIndex({ api_permissions: 1 }, { unique: true });

// 7. Create roles_api_permissions collection
db.createCollection('roles_api_permissions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['role_id', 'api_permission_id'],
      properties: {
        role_id: {
          bsonType: 'objectId'
        },
        api_permission_id: {
          bsonType: 'objectId'
        }
      }
    }
  }
});

// 8. Create pg_permissions collection
db.createCollection('pg_permissions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['pg_permissions'],
      properties: {
        pg_permissions: {
          bsonType: 'string'
        }
      }
    }
  }
});
db.pg_permissions.createIndex({ pg_permissions: 1 }, { unique: true });

// 9. Create role_pg_permissions collection
db.createCollection('role_pg_permissions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['role_id', 'pg_permission_id'],
      properties: {
        role_id: {
          bsonType: 'objectId'
        },
        pg_permission_id: {
          bsonType: 'objectId'
        }
      }
    }
  }
});

// ============================================================================
// INSERT DATA
// ============================================================================

// Insert roles data
db.roles.insertMany([
  { _id: ObjectId('68be2193ea73210503fa3352'), role: 'SuperAdmin' },
  { _id: ObjectId('68be21a51e962b2b59fa3352'), role: 'SalesAdmin' },
  { _id: ObjectId('68be21b0a9b5a7c8c0fa3352'), role: 'Distributor' }
]);

// Insert users data
db.users.insertMany([
  {
    _id: ObjectId('68be219bd6e9e04b16fa3352'),
    username: 'superadmin',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role_id: ObjectId('68be2193ea73210503fa3352'),
    email: 'superadmin@example.com',
    active: true,
    created_at: new Date('2025-09-08T03:05:15.678Z'),
    created_by: ObjectId('68be219bd6e9e04b16fa3352'),
    updated_at: new Date('2025-09-08T03:05:15.678Z'),
    updated_by: ObjectId('68be219bd6e9e04b16fa3352')
  },
  {
    _id: ObjectId('68be21c5eb15e1d107fa3352'),
    username: 'salesadmin',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role_id: ObjectId('68be21a51e962b2b59fa3352'),
    email: 'salesadmin@example.com',
    active: true,
    created_at: new Date('2025-09-08T03:06:13.006Z'),
    created_by: ObjectId('68be219bd6e9e04b16fa3352'),
    updated_at: new Date('2025-09-08T03:06:13.006Z'),
    updated_by: ObjectId('68be219bd6e9e04b16fa3352')
  },
  {
    _id: ObjectId('68be21d1d5e8a5dd4efa3352'),
    username: 'distributor',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'),
    email: 'distributor@example.com',
    active: true,
    created_at: new Date('2025-09-08T03:06:25.334Z'),
    created_by: ObjectId('68be219bd6e9e04b16fa3352'),
    updated_at: new Date('2025-09-08T03:06:25.334Z'),
    updated_by: ObjectId('68be219bd6e9e04b16fa3352')
  }
]);

// Insert sidebar_menu_items data
db.sidebar_menu_items.insertMany([
  {
    _id: ObjectId('68be292c6326800841fa3350'),
    label: 'Dashboard',
    href: '/dashboard',
    m_order: 1,
    icon: 'FaDashboard',
    parent_id: null,
    is_submenu: false
  },
  {
    _id: ObjectId('68be297464d508f0a4fa3350'),
    label: 'Admin',
    href: '/admin',
    m_order: 2,
    icon: 'FaUserShield',
    parent_id: null,
    is_submenu: false
  },
  {
    _id: ObjectId('68be29cc797ce968d4fa3350'),
    label: 'User',
    href: '/admin/user',
    m_order: 3,
    icon: 'FaUser',
    parent_id: ObjectId('68be297464d508f0a4fa3350'),
    is_submenu: true
  },
  {
    _id: ObjectId('68be29ddf5f3057028fa3350'),
    label: 'Password',
    href: '/admin/password',
    m_order: 4,
    icon: 'FaKey',
    parent_id: ObjectId('68be297464d508f0a4fa3350'),
    is_submenu: true
  },
  {
    _id: ObjectId('68be2a2337d76ea524fa3350'),
    label: 'Master',
    href: '/master',
    m_order: 5,
    icon: 'FaDatabase',
    parent_id: null,
    is_submenu: false
  },
  {
    _id: ObjectId('68be2a3f4ec3731485fa3350'),
    label: 'Brand',
    href: '/master/brands',
    m_order: 6,
    icon: 'FaTag',
    parent_id: ObjectId('68be2a2337d76ea524fa3350'),
    is_submenu: true
  }
]);

// Insert role_sidebar_menu_items data
db.role_sidebar_menu_items.insertMany([
  {
    _id: ObjectId('68be4b3dab47824caafa3350'),
    role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'),
    sidebar_menu_item_id: ObjectId('68be29ddf5f3057028fa3350')
  }
]);

// Insert brands data
db.brands.insertMany([
  {
    _id: ObjectId('68be4cd31e3dfb6215fa3350'),
    brand: 'PHT',
    created_at: new Date('2025-09-08T03:47:31.454Z'),
    created_by: ObjectId('68be219bd6e9e04b16fa3352'),
    updated_at: new Date('2025-09-08T03:47:31.454Z'),
    updated_by: ObjectId('68be219bd6e9e04b16fa3352')
  },
  {
    _id: ObjectId('68be4cd31e3dfb6215fa3351'),
    brand: 'RFL',
    created_at: new Date('2025-09-08T03:47:31.454Z'),
    created_by: ObjectId('68be219bd6e9e04b16fa3352'),
    updated_at: new Date('2025-09-08T03:47:31.454Z'),
    updated_by: ObjectId('68be219bd6e9e04b16fa3352')
  }
]);

// Insert api_permissions data
db.api_permissions.insertMany([
  { _id: ObjectId('68be4d6e95fe0273f8fa3350'), api_permissions: 'auth:login' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3351'), api_permissions: 'auth:refresh' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3352'), api_permissions: 'auth:logout' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3353'), api_permissions: 'users:create' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3354'), api_permissions: 'users:read' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3355'), api_permissions: 'users:update' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3356'), api_permissions: 'users:delete' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3357'), api_permissions: 'change:password' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3358'), api_permissions: 'brands:create' },
  { _id: ObjectId('68be4d6e95fe0273f8fa3359'), api_permissions: 'brands:read' },
  { _id: ObjectId('68be4d6e95fe0273f8fa335a'), api_permissions: 'brands:update' },
  { _id: ObjectId('68be4d6e95fe0273f8fa335b'), api_permissions: 'brands:delete' }
]);

// Insert roles_api_permissions data (SuperAdmin - all permissions)
db.roles_api_permissions.insertMany([
  { _id: ObjectId('68be4e18fb0aa983c5fa3350'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3350') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3351'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3351') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3352'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3352') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3353'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3353') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3354'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3354') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3355'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3355') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3356'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3356') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3357'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3357') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3358'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3358') },
  { _id: ObjectId('68be4e18fb0aa983c5fa3359'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3359') },
  { _id: ObjectId('68be4e18fb0aa983c5fa335a'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa335a') },
  { _id: ObjectId('68be4e18fb0aa983c5fa335b'), role_id: ObjectId('68be2193ea73210503fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa335b') }
]);

// Insert roles_api_permissions data (SalesAdmin - limited permissions)
db.roles_api_permissions.insertMany([
  { _id: ObjectId('68be4e507d26134afcfa3350'), role_id: ObjectId('68be21a51e962b2b59fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3350') },
  { _id: ObjectId('68be4e507d26134afcfa3351'), role_id: ObjectId('68be21a51e962b2b59fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3351') },
  { _id: ObjectId('68be4e507d26134afcfa3352'), role_id: ObjectId('68be21a51e962b2b59fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3352') },
  { _id: ObjectId('68be4e507d26134afcfa3353'), role_id: ObjectId('68be21a51e962b2b59fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3357') },
  { _id: ObjectId('68be4e507d26134afcfa3354'), role_id: ObjectId('68be21a51e962b2b59fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3358') },
  { _id: ObjectId('68be4e507d26134afcfa3355'), role_id: ObjectId('68be21a51e962b2b59fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3359') },
  { _id: ObjectId('68be4e507d26134afcfa3356'), role_id: ObjectId('68be21a51e962b2b59fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa335a') }
]);

// Insert roles_api_permissions data (Distributor - minimal permissions)
db.roles_api_permissions.insertMany([
  { _id: ObjectId('68be4e5b18d13add60fa3350'), role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3350') },
  { _id: ObjectId('68be4e5b18d13add60fa3351'), role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3351') },
  { _id: ObjectId('68be4e5b18d13add60fa3352'), role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3352') },
  { _id: ObjectId('68be4e5b18d13add60fa3353'), role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'), api_permission_id: ObjectId('68be4d6e95fe0273f8fa3357') }
]);

// Insert pg_permissions data
db.pg_permissions.insertMany([
  { _id: ObjectId('68be5052bd65258dedfa3350'), pg_permissions: 'pg:dashboard' },
  { _id: ObjectId('68be5052bd65258dedfa3351'), pg_permissions: 'pg:user' },
  { _id: ObjectId('68be5052bd65258dedfa3352'), pg_permissions: 'pg:brand' },
  { _id: ObjectId('68be5052bd65258dedfa3353'), pg_permissions: 'pg:category' },
  { _id: ObjectId('68be5052bd65258dedfa3354'), pg_permissions: 'pg:product' },
  { _id: ObjectId('68be5052bd65258dedfa3355'), pg_permissions: 'pg:outsourced_product' },
  { _id: ObjectId('68be5052bd65258dedfa3356'), pg_permissions: 'pg:territory' },
  { _id: ObjectId('68be5052bd65258dedfa3357'), pg_permissions: 'pg:zone' },
  { _id: ObjectId('68be5052bd65258dedfa3358'), pg_permissions: 'pg:region' },
  { _id: ObjectId('68be5052bd65258dedfa3359'), pg_permissions: 'pg:area' },
  { _id: ObjectId('68be5052bd65258dedfa335a'), pg_permissions: 'pg:distributor' }
]);

// Insert role_pg_permissions data (SuperAdmin - all page permissions)
db.role_pg_permissions.insertMany([
  { _id: ObjectId('68be51d0eef023b6d0fa3350'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3350') },
  { _id: ObjectId('68be51d0eef023b6d0fa3351'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3351') },
  { _id: ObjectId('68be51d0eef023b6d0fa3352'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3352') },
  { _id: ObjectId('68be51d0eef023b6d0fa3353'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3353') },
  { _id: ObjectId('68be51d0eef023b6d0fa3354'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3354') },
  { _id: ObjectId('68be51d0eef023b6d0fa3355'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3355') },
  { _id: ObjectId('68be51d0eef023b6d0fa3356'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3356') },
  { _id: ObjectId('68be51d0eef023b6d0fa3357'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3357') },
  { _id: ObjectId('68be51d0eef023b6d0fa3358'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3358') },
  { _id: ObjectId('68be51d0eef023b6d0fa3359'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3359') },
  { _id: ObjectId('68be51d0eef023b6d0fa335a'), role_id: ObjectId('68be2193ea73210503fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa335a') }
]);

// Insert role_pg_permissions data (SalesAdmin - limited page permissions)
db.role_pg_permissions.insertMany([
  { _id: ObjectId('68be51dec462377729fa3350'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3350') },
  { _id: ObjectId('68be51dec462377729fa3351'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3352') },
  { _id: ObjectId('68be51dec462377729fa3352'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3353') },
  { _id: ObjectId('68be51dec462377729fa3353'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3354') },
  { _id: ObjectId('68be51dec462377729fa3354'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3355') },
  { _id: ObjectId('68be51dec462377729fa3355'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3356') },
  { _id: ObjectId('68be51dec462377729fa3356'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3357') },
  { _id: ObjectId('68be51dec462377729fa3357'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3358') },
  { _id: ObjectId('68be51dec462377729fa3358'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3359') },
  { _id: ObjectId('68be51dec462377729fa3359'), role_id: ObjectId('68be21a51e962b2b59fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa335a') }
]);

// Insert role_pg_permissions data (Distributor - minimal page permissions)
db.role_pg_permissions.insertMany([
  { _id: ObjectId('68be51e81d50c61871fa3350'), role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3350') },
  { _id: ObjectId('68be51e81d50c61871fa3351'), role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3354') },
  { _id: ObjectId('68be51e81d50c61871fa3352'), role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa3355') },
  { _id: ObjectId('68be51e81d50c61871fa3353'), role_id: ObjectId('68be21b0a9b5a7c8c0fa3352'), pg_permission_id: ObjectId('68be5052bd65258dedfa335a') }
]);

// ============================================================================
// VERIFICATION
// ============================================================================

print('Database restoration completed successfully!');
print('');
print('Collections created:');
db.getCollectionNames().forEach(function(collection) {
    var count = db[collection].countDocuments();
    print('- ' + collection + ': ' + count + ' documents');
});

print('');
print('Indexes created:');
db.getCollectionNames().forEach(function(collection) {
    var indexes = db[collection].getIndexes();
    if (indexes.length > 1) {
        print('- ' + collection + ':');
        indexes.forEach(function(index) {
            if (index.name !== '_id_') {
                print('  * ' + index.name + (index.unique ? ' (unique)' : ''));
            }
        });
    }
});
