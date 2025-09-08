// Create sidebar_menu_items collection with validation
db.createCollection('sidebar_menu_items', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['label', 'm_order'],
      properties: {
        label: {
          bsonType: 'string',
          minLength: 1
        },
        href: {
          bsonType: ['string', 'null']
        },
        m_order: {
          bsonType: 'number'
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

// Create unique index on label
db.sidebar_menu_items.createIndex({ label: 1 }, { unique: true });

print('sidebar_menu_items collection created successfully');
