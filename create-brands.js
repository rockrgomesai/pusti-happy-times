// Create brands collection
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

// Create unique index on brand field
db.brands.createIndex({ brand: 1 }, { unique: true });

print('brands collection created successfully with unique index on brand field');
