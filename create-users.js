// Create users collection with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'password', 'role_id', 'email'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 1
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        role_id: {
          bsonType: 'objectId'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        active: {
          bsonType: 'bool'
        },
        created_at: {
          bsonType: 'date'
        },
        updated_at: {
          bsonType: 'date'
        },
        created_by: {
          bsonType: 'objectId'
        },
        updated_by: {
          bsonType: 'objectId'
        }
      }
    }
  }
});

// Create unique indexes
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });

print('Users collection created successfully');
