// Create role_sidebar_menu_items collection
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

print('role_sidebar_menu_items collection created successfully');
