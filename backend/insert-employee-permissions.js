/**
 * Insert Employee API Permissions
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pusti-ht-mern');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const insertEmployeePermissions = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('api_permissions');
    
    // Employee permissions to insert
    const employeePermissions = [
      { api_permissions: "employees:read" },
      { api_permissions: "employees:create" },
      { api_permissions: "employees:update" },
      { api_permissions: "employees:delete" }
    ];
    
    // Check if permissions already exist
    const existingPermissions = await collection.find({
      api_permissions: { $in: employeePermissions.map(p => p.api_permissions) }
    }).toArray();
    
    if (existingPermissions.length > 0) {
      console.log('⚠️  Some employee permissions already exist:');
      existingPermissions.forEach(perm => {
        console.log(`   - ${perm.api_permissions}`);
      });
    }
    
    // Insert new permissions (skip duplicates)
    const existingPermissionNames = existingPermissions.map(p => p.api_permissions);
    const newPermissions = employeePermissions.filter(p => 
      !existingPermissionNames.includes(p.api_permissions)
    );
    
    if (newPermissions.length > 0) {
      const result = await collection.insertMany(newPermissions);
      console.log(`✅ Successfully inserted ${result.insertedCount} employee permissions:`);
      newPermissions.forEach(perm => {
        console.log(`   - ${perm.api_permissions}`);
      });
    } else {
      console.log('ℹ️  All employee permissions already exist. No new permissions inserted.');
    }
    
    // Verify the insertion
    console.log('\n📋 Current employee permissions in database:');
    const allEmployeePermissions = await collection.find({
      api_permissions: { $regex: /^employees:/ }
    }).toArray();
    
    allEmployeePermissions.forEach(perm => {
      console.log(`   - ${perm.api_permissions} (ID: ${perm._id})`);
    });
    
  } catch (error) {
    console.error('❌ Error inserting employee permissions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed.');
    process.exit(0);
  }
};

// Run the script
insertEmployeePermissions();