/**
 * Insert Factory API Permissions
 * Script to add factory-related permissions to the api_permissions collection
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
  const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti_happy_times');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const insertFactoryPermissions = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('api_permissions');
    
    // Factory permissions to insert
    const factoryPermissions = [
      { api_permissions: "factories:read" },
      { api_permissions: "factories:create" },
      { api_permissions: "factories:update" },
      { api_permissions: "factories:delete" }
    ];
    
    // Check if permissions already exist
    const existingPermissions = await collection.find({
      api_permissions: { $in: factoryPermissions.map(p => p.api_permissions) }
    }).toArray();
    
    if (existingPermissions.length > 0) {
      console.log('⚠️  Some factory permissions already exist:');
      existingPermissions.forEach(perm => {
        console.log(`   - ${perm.api_permissions}`);
      });
    }
    
    // Insert new permissions (skip duplicates)
    const existingPermissionNames = existingPermissions.map(p => p.api_permissions);
    const newPermissions = factoryPermissions.filter(p => 
      !existingPermissionNames.includes(p.api_permissions)
    );
    
    if (newPermissions.length > 0) {
      const result = await collection.insertMany(newPermissions);
      console.log(`✅ Successfully inserted ${result.insertedCount} factory permissions:`);
      newPermissions.forEach(perm => {
        console.log(`   - ${perm.api_permissions}`);
      });
    } else {
      console.log('ℹ️  All factory permissions already exist. No new permissions inserted.');
    }
    
    // Verify the insertion
    console.log('\n📋 Current factory permissions in database:');
    const allFactoryPermissions = await collection.find({
      api_permissions: { $regex: /^factories:/ }
    }).toArray();
    
    allFactoryPermissions.forEach(perm => {
      console.log(`   - ${perm.api_permissions} (ID: ${perm._id})`);
    });
    
  } catch (error) {
    console.error('❌ Error inserting factory permissions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed.');
    process.exit(0);
  }
};

// Run the script
insertFactoryPermissions();