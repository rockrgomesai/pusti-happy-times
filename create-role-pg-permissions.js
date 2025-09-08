// Create role_pg_permissions collection
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

print('role_pg_permissions collection created successfully');
