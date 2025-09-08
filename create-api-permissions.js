// Create api_permissions collection
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

// Create unique index on api_permissions field
db.api_permissions.createIndex({ api_permissions: 1 }, { unique: true });

print('api_permissions collection created successfully with unique index on api_permissions field');
