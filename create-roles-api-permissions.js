// Create roles_api_permissions collection
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

print('roles_api_permissions collection created successfully');
