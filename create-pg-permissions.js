// Create pg_permissions collection
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

// Create unique index on pg_permissions field
db.pg_permissions.createIndex({ pg_permissions: 1 }, { unique: true });

print('pg_permissions collection created successfully with unique index on pg_permissions field');
