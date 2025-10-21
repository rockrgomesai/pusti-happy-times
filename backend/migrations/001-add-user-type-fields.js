/**
 * Migration Script: Add User Type Fields
 * 
 * Adds the following fields to the users collection:
 * - user_type (default: 'employee')
 * - employee_id (default: null)
 * - distributor_id (default: null)
 * - tokenVersion (default: 0)
 * 
 * Usage:
 *   node backend/migrations/001-add-user-type-fields.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrate() {
  try {
    console.log('\n🔄 Starting migration: Add user_type fields to users collection\n');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check current state
    const totalUsers = await usersCollection.countDocuments();
    console.log(`📊 Found ${totalUsers} users in collection`);
    
    // Add new fields to all users
    const result = await usersCollection.updateMany(
      {},
      {
        $set: {
          user_type: 'employee',      // Default to employee
          employee_id: null,          // Will be linked manually
          distributor_id: null,
          tokenVersion: 0
        }
      }
    );
    
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`   - Updated: ${result.modifiedCount} users`);
    console.log(`   - Matched: ${result.matchedCount} users`);
    
    console.log('\n⚠️  MANUAL ACTION REQUIRED:');
    console.log('   1. Link users to employees by setting employee_id field');
    console.log('   2. Link distributor users by setting distributor_id and user_type');
    console.log('   3. Verify all users have correct user_type');
    
    console.log('\n📝 Example MongoDB commands:');
    console.log('   // Link a user to an employee');
    console.log('   db.users.updateOne(');
    console.log('     { username: "john.doe" },');
    console.log('     { $set: { employee_id: ObjectId("..."), user_type: "employee" } }');
    console.log('   );');
    console.log('');
    console.log('   // Link a user to a distributor');
    console.log('   db.users.updateOne(');
    console.log('     { username: "dist.user" },');
    console.log('     { $set: { distributor_id: ObjectId("..."), user_type: "distributor" } }');
    console.log('   );');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

async function run() {
  try {
    await connectDB();
    await migrate();
    console.log('\n✅ Migration script completed successfully\n');
  } catch (error) {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB\n');
    process.exit(0);
  }
}

run();
