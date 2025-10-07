/**
 * Insert Page Permissions
 * Script to add page-related permissions to the pg_permissions collection
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

const insertPagePermissions = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('pg_permissions');
    
    // Page permissions to insert
    const pagePermissions = [
      { pg_permissions: "pg:Factory" },
      { pg_permissions: "pg:Depot" },
      { pg_permissions: "pg:Transport" },
      { pg_permissions: "pg:Designation" }
    ];
    
    // Check if permissions already exist
    const existingPermissions = await collection.find({
      pg_permissions: { $in: pagePermissions.map(p => p.pg_permissions) }
    }).toArray();
    
    if (existingPermissions.length > 0) {
      console.log('⚠️  Some page permissions already exist:');
      existingPermissions.forEach(perm => {
        console.log(`   - ${perm.pg_permissions}`);
      });
    }
    
    // Insert new permissions (skip duplicates)
    const existingPermissionNames = existingPermissions.map(p => p.pg_permissions);
    const newPermissions = pagePermissions.filter(p => 
      !existingPermissionNames.includes(p.pg_permissions)
    );
    
    if (newPermissions.length > 0) {
      const result = await collection.insertMany(newPermissions);
      console.log(`✅ Successfully inserted ${result.insertedCount} page permissions:`);
      newPermissions.forEach(perm => {
        console.log(`   - ${perm.pg_permissions}`);
      });
    } else {
      console.log('ℹ️  All page permissions already exist. No new permissions inserted.');
    }
    
    // Verify the insertion
    console.log('\n📋 Current page permissions in database:');
    const allPagePermissions = await collection.find({
      pg_permissions: { $regex: /^pg:/ }
    }).toArray();
    
    allPagePermissions.forEach(perm => {
      console.log(`   - ${perm.pg_permissions} (ID: ${perm._id})`);
    });
    
  } catch (error) {
    console.error('❌ Error inserting page permissions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed.');
    process.exit(0);
  }
};

// Run the script
insertPagePermissions();