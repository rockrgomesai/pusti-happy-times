// Create roles collection with validation
db.createCollection('roles', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['role'],
      properties: {
        role: {
          bsonType: 'string',
          minLength: 1
        }
      }
    }
  }
});

// Create unique index on role field
db.roles.createIndex({ role: 1 }, { unique: true });

print('Roles collection created successfully with validation and unique index');
